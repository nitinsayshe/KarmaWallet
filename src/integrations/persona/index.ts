import dayjs from 'dayjs';
import { PersonaClient } from '../../clients/persona';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { ServerModel, ServerTypesEnum, ServerSourcesEnum } from '../../models/server';
import { ICreateKarmaCardApplicantData } from '../../services/karmaCard/utils';
import { IRequest } from '../../types/request';
import { IPersonaCreateAccountBody, PersonaWebhookBody } from './types';

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
  let requesterIp: string = process.env.NODE_ENV === 'development' ? req.headers['x-forwarded-for'] : req.headers['x-real-ip'];
  requesterIp = requesterIp?.trim();

  // pull whitelisted Comply Advantage IPs from the database
  let whitelistedServers;
  try {
    whitelistedServers = await ServerModel.find({ type: ServerTypesEnum.Whitelist, source: ServerSourcesEnum.Persona });
  } catch (e) {
    throw new CustomError('Error fetching whitelisted servers', ErrorTypes.SERVER);
  }

  // check if the request was sent from a whitelisted IP
  if (!whitelistedServers.find((server) => server.ip === requesterIp)) {
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

// refId can be KW internal user id or visitor id
export const buildPersonaCreateAccountBody = (params: ICreateKarmaCardApplicantData, refId?: string) => {
  const personaData: IPersonaCreateAccountBody = {
    data: {
      attributes: {
        'country-code': 'US',
        'social-security-number': params.ssn,
        'name-first': params.firstName,
        'name-last': params.lastName,
        birthdate: dayjs(params.birthDate).format('YYYY-MM-DD'), // 'YYYY-MM-DD
        'phone-number': params.phone,
        'email-address': params.email,
        'address-street-1': params.address1,
        'address-city': params.city,
        'address-subdivision': params.state,
        'address-postal-code': params.postalCode,
      },
    },
  };

  if (!!refId) personaData.data.attributes['ref-id'] = refId;
  if (!!params.address2) personaData.data.attributes['address-street-2'] = params.address2;
  return personaData;
};
