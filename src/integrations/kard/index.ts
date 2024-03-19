import { AxiosResponse } from 'axios';
import { Types } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { SafeParseError, z } from 'zod';
import {
  AddCardToUserResponse,
  CardInfo,
  CreateUserRequest,
  EarnedRewardWebhookBody,
  KardClient,
  KardEnvironmentEnum,
  KardIssuerName,
  QueueTransactionsRequest,
  Transaction,
} from '../../clients/kard';
import { CentsInUSD, ErrorTypes, KardEnrollmentStatus } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { getUtcDate } from '../../lib/date';
import { decrypt } from '../../lib/encryption';
import { floorToPercision, sleep } from '../../lib/misc';
import { CardModel, ICard, ICardDocument, IKardIntegration } from '../../models/card';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { IMerchantDocument, MerchantModel } from '../../models/merchant';
import { ITransaction } from '../../models/transaction';
import { IUserDocument, UserModel } from '../../models/user';
import { getNetworkFromBin } from '../../services/card/utils';

const uuidSchema = z.string().uuid();
const QueueTransactionBatchSize = 50;
const QueueTransactionBackoffMs = 1000;

export const getFormattedUserName = (name: string): string => name?.trim()?.split(' ')?.join('') || '';

export const getCardInfo = (card: ICardDocument): CardInfo => {
  const last4 = !!card?.lastFourDigitsToken ? decrypt(card.lastFourDigitsToken) : '';
  const bin = !!card?.binToken ? decrypt(card.binToken) : '';
  if (!last4 || !bin) {
    throw new Error('Missing card info');
  }
  const issuer = KardIssuerName;
  const network = getNetworkFromBin(bin) || '';
  if (!issuer || !network) {
    throw new Error('Missing card issuer or network info');
  }
  return {
    last4,
    bin,
    issuer,
    network,
  };
};

export const registerCardInKardRewards = async (kardUserId: string, card: ICardDocument): Promise<AddCardToUserResponse> => {
  try {
    const kard = new KardClient();
    const cardInfo = getCardInfo(card);
    return kard.addCardToUser({
      referringPartnerUserId: kardUserId,
      cardInfo,
    });
  } catch (error) {
    console.error('Error registering card in Kard Rewards', error);
    return null;
  }
};

export const addKardIntegrationToCard = async (card: ICardDocument, integration: IKardIntegration): Promise<ICardDocument> => {
  try {
    if (!card.integrations) {
      card.integrations = {};
    }
    card.integrations.kard = integration;
    return card.save();
  } catch (error) {
    console.error('Error adding kard integration to card', error);
  }
};

export const createKardUserFromUser = async (
  user: IUserDocument,
  card: ICardDocument,
): Promise<{ error: CustomError | void; integration: IKardIntegration | null }> => {
  try {
    const email = user?.emails?.find((e) => e.primary)?.email;

    const dateKardAccountCreated = card?.integrations?.kard?.createdOn;
    if (!!dateKardAccountCreated) {
      return {
        error: new CustomError('Card already has related user account with Kard', ErrorTypes.CONFLICT),
        integration: null,
      };
    }

    const kard = new KardClient();
    const kardIntegration: IKardIntegration = {
      userId: uuid(),
      createdOn: getUtcDate().toDate(),
      enrollmentStatus: KardEnrollmentStatus.Enrolled,
    };

    const req: CreateUserRequest = {
      email,
      userName: getFormattedUserName(user?.name),
      cardInfo: getCardInfo(card),
      referringPartnerUserId: kardIntegration.userId,
    };

    console.log('creating new kard user for userId: ', user._id, 'on card id: ', card._id);
    const res = await kard.createUser(req);
    if (res.status !== 201) {
      return {
        error: new CustomError("Error: new Kard user couldn't be created", ErrorTypes.SERVER),
        integration: null,
      };
    }
    return { error: null, integration: kardIntegration };
  } catch (error) {
    return { error: new CustomError('Error creating kard user', ErrorTypes.SERVER), integration: null };
  }
};

export const createKardUserAndAddIntegrations = async (user: IUserDocument, card: ICardDocument): Promise<ICardDocument> => {
  const kardIntegrationData = await createKardUserFromUser(user, card);
  if (!!kardIntegrationData.error || !kardIntegrationData.integration) {
    throw kardIntegrationData.error || new CustomError('Error creating kard user', ErrorTypes.SERVER);
  }

  const updatedCard = await addKardIntegrationToCard(card, kardIntegrationData.integration);
  if (!updatedCard || !updatedCard.integrations?.kard) {
    throw new CustomError('Error adding kard integration to card', ErrorTypes.SERVER);
  }
  return updatedCard;
};

export const deleteKardUserForCard = async (card: ICardDocument | Types.ObjectId): Promise<ICardDocument | null> => {
  try {
    if (!(card as ICardDocument)?.name) {
      card = await CardModel.findById(card);
    }

    if (!card) {
      console.error('Error deleting kard account.\nNo card found.');
      return null;
    }

    const c = card as ICardDocument;
    const kardUserId = c?.integrations?.kard?.userId;
    if (!kardUserId || !!(uuidSchema.safeParse(kardUserId) as SafeParseError<string>).error) {
      console.error(
        'Error deleting kard account.\nNo kard integration object or invalid kard user id.\ncard integrations:  ',
        JSON.stringify(c.integrations, null, 2),
      );
      return;
    }

    console.log('unenrolling card, ', c._id, ', from kard and deleting associated user.');
    const kc = new KardClient();
    await kc.deleteUser(kardUserId);
    c.integrations.kard.enrollmentStatus = KardEnrollmentStatus.Unenrolled;
    return c.save();
  } catch (err) {
    console.error('Error deleting kard user: ', err);
    return null;
  }
};

// delete a user from Kard
export const deleteKardUsersForUser = async (user: IUserDocument | Types.ObjectId): Promise<ICardDocument[]> => {
  try {
    if (!(user as IUserDocument)?.name) {
      user = await UserModel.findById(user);
    }
    const u = user as IUserDocument;
    // delete each one from kard
    const cards = await CardModel.find({ userId: u._id });
    const updatedCards = await Promise.all(
      cards.map(async (c) => {
        const kardUserId = c?.integrations?.kard?.userId;
        if (!kardUserId || !!(uuidSchema.safeParse(kardUserId) as SafeParseError<string>).error) {
          console.error(
            'Error deleting kard account.\nNo kard integration object or invalid kard user id.\ncard integrations:  ',
            JSON.stringify(c.integrations, null, 2),
          );
          return;
        }

        console.log('unenrolling card, ', c._id, ', from kard and deleting associated user.');
        const kc = new KardClient();
        await kc.deleteUser(kardUserId);
        c.integrations.kard.enrollmentStatus = KardEnrollmentStatus.Unenrolled;
        return c.save();
      }),
    );
    return updatedCards;
  } catch (err) {
    console.error('Error deleting kard user: ', err);
    return [];
  }
};

const populateCompaniesAndMerchantsOnTransactions = async (
  transactions: Partial<ITransaction & { _id: Types.ObjectId }>[],
): Promise<Partial<ITransaction & { _id: Types.ObjectId }>[]> => {
  const companies: { [key: string]: ICompanyDocument } = {};
  return Promise.all(
    transactions.map(async (t) => {
      try {
        let company = companies[t.company?.toString()];
        if (!company) {
          company = await CompanyModel.findById(t.company);
          companies[t.company.toString()] = company;
        }
        if (!!company?.merchant) {
          const merchant = await MerchantModel.findById(company.merchant);
          company.merchant = merchant;
        }
        t.company = company;
        // lookup the merchant on the company
        return t;
      } catch (err) {
        console.error('Error populating company and merchant: ', err);
      }
    }),
  );
};

const sendTransactionsInBatches = async (
  batches: Partial<ITransaction & { _id: Types.ObjectId }>[][],
  card: ICardDocument,
): Promise<AxiosResponse<{}, any>[]> => {
  const responses: AxiosResponse<{}, any>[] = [];
  const kc = new KardClient();
  for (let i = 0; i < batches.length; i++) {
    try {
      const batch = batches[i];
      const req: QueueTransactionsRequest = batch.map((t): Transaction => {
        const merchantName = ((t.company as ICompanyDocument)?.merchant as IMerchantDocument)?.integrations?.kard?.name
          || ((t.company as ICompanyDocument)?.merchant as IMerchantDocument)?.name
          || (t.company as ICompanyDocument)?.companyName;

        return {
          transactionId: t.integrations?.kard?.id,
          referringPartnerUserId: card?.integrations?.kard?.userId,
          amount: floorToPercision(t.amount * CentsInUSD, 0),
          status: t?.integrations?.kard?.status,
          currency: t?.integrations?.plaid?.iso_currency_code,
          description: merchantName,
          settledDate: t?.date?.toISOString(),
          merchantName,
          mcc: (t.company as ICompanyDocument)?.mcc?.toString(),
          cardBIN: decrypt((t?.card as ICard)?.binToken),
          cardLastFour: decrypt((t?.card as ICard)?.lastFourDigitsToken),
          authorizationDate: t?.date?.toISOString(),
        };
      });

      console.log(`Kard API Request ${i} of ${batches.length}.`);
      responses.push(await kc.queueTransactionsForProcessing(req));
      await sleep(QueueTransactionBackoffMs);
    } catch (err) {
      console.error('Error queuing transactions: ', err);
    }
  }

  return responses;
};

export const queueSettledTransactions = async (
  card: ICardDocument | Types.ObjectId,
  transactions: Partial<ITransaction & { _id: Types.ObjectId }>[],
): Promise<AxiosResponse<{}, any>[] | void> => {
  try {
    if (!(card as ICardDocument)?.name) {
      card = await CardModel.findById(card);
    }
    const c = card as ICardDocument;
    if (!c?.integrations?.kard?.userId) {
      throw new Error('No kard integration object on card.');
    }

    // populate companies
    transactions = await populateCompaniesAndMerchantsOnTransactions(transactions);

    // filter out transactions that don't have a company match
    transactions = transactions.filter((t) => !!t.company);

    // slpit transactions into chunks of 50
    const batches: Partial<
    ITransaction & {
      _id: Types.ObjectId;
    }
    >[][] = [];

    for (let i = 0; i < transactions.length; i += QueueTransactionBatchSize) {
      batches.push(transactions.slice(i, i + QueueTransactionBatchSize));
    }

    return sendTransactionsInBatches(batches, c);
  } catch (err) {
    console.error('Error queuing transactions: ', err);
  }
};

export const verifyIssuerEnvWebhookSignature = async (body: EarnedRewardWebhookBody, signature: string): Promise<Error | null> => {
  try {
    const client = new KardClient(KardEnvironmentEnum.Issuer);
    return await client.verifyWebhookSignature(body, signature);
  } catch (err) {
    const errorText = 'Error verifying issuer environment webhook signature';
    console.error(`${errorText}: `, err);
    return new Error(errorText);
  }
};

export const verifyAggregatorEnvWebhookSignature = async (body: EarnedRewardWebhookBody, signature: string): Promise<Error | null> => {
  try {
    const client = new KardClient(KardEnvironmentEnum.Aggregator);
    return await client.verifyWebhookSignature(body, signature);
  } catch (err) {
    const errorText = 'Error verifying aggregator environment webhook signature';
    console.error(`${errorText}: `, err);
    return new Error(errorText);
  }
};
