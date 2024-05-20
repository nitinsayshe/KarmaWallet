import dayjs from 'dayjs';
import { PersonaClient } from '../../clients/persona';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { ServerModel, ServerTypesEnum, ServerSourcesEnum } from '../../models/server';
import { IUserDocument, UserModel } from '../../models/user';
import { IVisitorDocument, VisitorModel } from '../../models/visitor';
import { ICreateKarmaCardApplicantData } from '../../services/karmaCard/utils/types';
import { IRequest } from '../../types/request';
import { IPersonaCreateAccountBody, IPersonaInquiryData, PersonaAccountData, PersonaInquiryStatusEnum, PersonaWebhookBody } from './types';

export const verifyPersonaWebhookSignature = async (req: IRequest<{}, {}, PersonaWebhookBody>) => {
  try {
    const client = new PersonaClient();
    return await client.verifyWebhookSignature(req);
  } catch (err) {
    const errorText = 'Error verifying webhook signature';
    console.error(`${errorText}: `, err);
    throw new Error(errorText);
  }
};

export const verifyPersonaWebhookSource = async (req: IRequest<{}, {}, PersonaWebhookBody>) => {
  // get the ip this request was sent from in the request
  // uses the forwarded IP if in dev environmnet since we are using ngrok
  let requesterIp: string;
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
    requesterIp = req.headers['x-forwarded-for'];
  } else if (process.env.NODE_ENV === 'staging') {
    requesterIp = req.headers['x-real-ip'];
  }

  const ips = requesterIp?.split(',').map((ip) => ip.trim());

  // pull whitelisted Comply Advantage IPs from the database
  let whitelistedServers;
  try {
    whitelistedServers = await ServerModel.find({ type: ServerTypesEnum.Whitelist, source: ServerSourcesEnum.Persona });
  } catch (e) {
    throw new CustomError('Error fetching whitelisted servers', ErrorTypes.SERVER);
  }

  let foundServer = false;
  for (const ip of ips) {
    if (whitelistedServers.find((server) => server.ip === ip)) {
      foundServer = true;
      break;
    }
  }

  // check if the request was sent from a whitelisted IP
  if (!foundServer) {
    throw new CustomError('Access Denied', ErrorTypes.NOT_ALLOWED);
  }
};

export const verifyPersonaWebhook = async (req: IRequest<{}, {}, PersonaWebhookBody>) => {
  console.log('Verifying Persona webhook...');
  await verifyPersonaWebhookSource(req);
  console.log('Persona webhook source verified!');
  await verifyPersonaWebhookSignature(req);
  console.log('Persona webhook signature verified!');
};

export const hasEntityPassedInternalKyc = async (entity: IUserDocument | IVisitorDocument) => entity?.integrations?.persona?.inquiries?.some(
  (inquiry) => inquiry.status === PersonaInquiryStatusEnum.Approved || inquiry.status === PersonaInquiryStatusEnum.Completed,
);

// refId can be KW internal user id or visitor id
export const buildPersonaCreateAccountBody = (params: ICreateKarmaCardApplicantData, refId?: string) => {
  const personaData: IPersonaCreateAccountBody = {
    data: {
      attributes: {
        countryCode: 'US',
        socialSecurityNumber: params.ssn,
        nameFirst: params.firstName,
        nameLast: params.lastName,
        birthdate: dayjs(params.birthDate).format('YYYY-MM-DD'), // 'YYYY-MM-DD
        phoneNumber: params.phone,
        emailAddress: params.email,
        addressStreet1: params.address1,
        addressCity: params.city,
        addressSubdivision: params.state,
        addressPostalCode: params.postalCode,
      },
    },
  };

  if (!!refId) personaData.data.attributes.refId = refId;
  if (!!params.address2) personaData.data.attributes.addressStreet2 = params.address2;
  return personaData;
};

export const personaInquiryInSuccessState = (inquiryData: IPersonaInquiryData): boolean => inquiryData?.status === PersonaInquiryStatusEnum.Completed
  || inquiryData?.status === PersonaInquiryStatusEnum.Approved
  || inquiryData?.attributes?.status === PersonaInquiryStatusEnum.Completed
  || inquiryData?.attributes?.status === PersonaInquiryStatusEnum.Approved;

export const createOrUpdatePersonaIntegration = async (
  entity: IUserDocument | IVisitorDocument,
  accountId: string,
  inquiryData: IPersonaInquiryData,
): Promise<IPersonaInquiryData> => {
  if (!entity.integrations) entity.integrations = {};

  if (!accountId || !inquiryData.id || !inquiryData.status || !inquiryData.createdAt) {
    throw new Error(`Invalid inquiry data: ${JSON.stringify({ accountId, inquiryData }, null, 2)}`);
  }

  const existingAccountId = entity?.integrations?.persona?.accountId;
  if (!!existingAccountId && existingAccountId !== accountId) {
    const email = entity?.email || (entity as IUserDocument)?.emails?.find((e) => e?.primary);
    console.warn(
      `Persona account id mismatch. User or visitor with email: ${email} has account id ${existingAccountId} but inquiry has account id ${accountId}`,
    );
  }

  const existingInquiries = entity?.integrations?.persona?.inquiries || [];
  if (existingInquiries.length > 0) {
    // check if there's one with the inquiry id already
    // if so, update it
    const existingInquiryIndex = existingInquiries.findIndex((i) => i.id === inquiryData.id);
    if (existingInquiryIndex > -1) {
      existingInquiries[existingInquiryIndex] = inquiryData;
      entity.integrations.persona = {
        accountId,
        inquiries: existingInquiries,
      };
    }
  } else {
    entity.integrations.persona = {
      accountId,
      inquiries: [...existingInquiries, inquiryData],
    };
  }

  await entity.save();
  return inquiryData;
};

export const fetchInquiryAndCreateOrUpdateIntegration = async (
  inquiryId: string,
  entity: IUserDocument | IVisitorDocument,
): Promise<IPersonaInquiryData> => {
  try {
    const client = new PersonaClient();
    const inquiry = await client.getInquiry(inquiryId);
    // create integration with inquiry data
    const templateId = inquiry?.data?.relationships?.inquiryTemplate?.data?.id;
    const accountId = inquiry?.data?.relationships?.account?.data?.id;
    const inquiryData = {
      id: inquiry?.data?.id,
      status: inquiry?.data?.attributes?.status,
      templateId,
      createdAt: inquiry?.data?.attributes?.createdAt,
    };
    return await createOrUpdatePersonaIntegration(entity, accountId, inquiryData);
  } catch (err) {
    console.log(err);
  }
};

export const getResumeSessionToken = async (inquiryId: string): Promise<string> => {
  try {
    if (!inquiryId) {
      throw new CustomError('No inquiry id provided.', ErrorTypes.INVALID_ARG);
    }
    const client = new PersonaClient();
    const inquiry = await client.resumeInquiry(inquiryId);
    return inquiry?.meta?.sessionToken;
  } catch (err) {
    console.log(`Error getting resume session token for inquiry with id: ${inquiryId}: ${err}`);
    throw new CustomError('No resume session token found for inquiry.', ErrorTypes.NOT_FOUND);
  }
};

export const getPersonaAccountId = async (email: string): Promise<PersonaAccountData> => {
  try {
    let entity: IUserDocument | IVisitorDocument | null = null;

    entity = await UserModel.findOne({ 'emails.email': email });

    const foundUser = !!entity?._id;
    if (!foundUser) {
      entity = await VisitorModel.findOne({ email });
    }
    if (!entity) {
      throw new CustomError(`No user or visitor found with email: ${email}`, ErrorTypes.NOT_FOUND);
    }
    return { accountId: entity?.integrations?.persona?.accountId };
  } catch (err) {
    console.log(`Error getting persona account id for visitor or user with email: ${email}: ${err}`);
    throw new CustomError(`No persona account id found for a visitor or user with email: ${email}`, ErrorTypes.NOT_FOUND);
  }
};
