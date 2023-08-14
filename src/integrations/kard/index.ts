import { AxiosResponse } from 'axios';
import { Types } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { SafeParseError, z } from 'zod';
import {
  AddCardToUserResponse,
  CardInfo,
  CreateUserRequest,
  KardClient,
  KardIssuer,
  QueueTransactionsRequest,
  Transaction,
} from '../../clients/kard';
import { CentsInUSD } from '../../lib/constants';
import { getUtcDate } from '../../lib/date';
import { decrypt } from '../../lib/encryption';
import { ICard, ICardDocument } from '../../models/card';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { ITransaction } from '../../models/transaction';
import { IKardIntegration, IUserDocument, UserModel } from '../../models/user';
import { getNetworkFromBin } from '../../services/card/utils';

const uuidSchema = z.string().uuid();

export const getFormattedUserName = (name: string): string => name?.trim()?.split(' ')?.join('') || '';

export const getCardInfo = (card: ICardDocument): CardInfo => {
  const last4 = !!card?.lastFourDigitsToken ? decrypt(card.lastFourDigitsToken) : '';
  const bin = !!card?.binToken ? decrypt(card.binToken) : '';
  if (!last4 || !bin) {
    throw new Error('Missing card info');
  }
  const issuer = KardIssuer;
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

export const registerCardInKardRewards = async (
  kardUserId: string,
  card: ICardDocument,
): Promise<AddCardToUserResponse> => {
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

export const addKardIntegrationToUser = async (
  user: IUserDocument,
  kardIntegration: IKardIntegration,
): Promise<IUserDocument> => {
  try {
    if (!user.integrations) {
      user.integrations = {};
    }
    user.integrations.kard = kardIntegration;
    return user.save();
  } catch (error) {
    console.error('Error adding kard integration to user', error);
  }
};

export const addKardIntegrationToCard = async (card: ICardDocument): Promise<ICardDocument> => {
  try {
    if (!card.integrations) {
      card.integrations = {};
    }
    card.integrations.kard = { dateAdded: getUtcDate().toDate() };
    return card.save();
  } catch (error) {
    console.error('Error adding kard integration to card', error);
  }
};

export const createKardUserAndAddIntegrations = async (
  user: IUserDocument,
  card: ICardDocument,
): Promise<{ updatedUser: IUserDocument; updatedCard: ICardDocument }> => {
  const email = user?.emails?.find((e) => e.primary)?.email;

  const dateKardAccountCreated = user?.integrations?.kard?.dateAccountCreated;
  if (!!dateKardAccountCreated) {
    throw new Error(
      `Error creating new kard account for user: ${user._id.toString()}. User already has a kard account.`,
    );
  }

  const kard = new KardClient();
  const userKardIntegration: IKardIntegration = {
    userId: uuid(),
    dateAccountCreated: getUtcDate().toDate(),
  };

  const req: CreateUserRequest = {
    email,
    userName: getFormattedUserName(user?.name),
    cardInfo: getCardInfo(card),
    referringPartnerUserId: userKardIntegration.userId,
  };

  console.log('creating new kard user for userId: ', user._id);
  await kard.createUser(req);

  // create a kard integration object with id and date created and save it to the user
  const updatedUser = await addKardIntegrationToUser(user, userKardIntegration);
  if (!updatedUser) {
    throw new Error('Error adding kard integration to user');
  }

  const updatedCard = await addKardIntegrationToCard(card);
  if (!updatedCard) {
    throw new Error('Error adding kard integration to card');
  }
  return { updatedUser, updatedCard };
};

// delete a user from Kard
export const deleteKardUser = async (user: IUserDocument | Types.ObjectId): Promise<AxiosResponse | void> => {
  try {
    if (!(user as IUserDocument)?.name) {
      user = await UserModel.findById(user);
    }
    const u = user as IUserDocument;
    if (
      !u?.integrations?.kard?.userId
      || !!(uuidSchema.safeParse(u.integrations.kard.userId) as SafeParseError<string>).error
    ) {
      console.error(
        'Error deleting kard account.\nNo kard integration object or invalid kard user id.\nuser integrations:  ',
        JSON.stringify(u.integrations, null, 2),
      );
      return;
    }

    console.log('deleting user, ', u._id, ', from kard');
    const kc = new KardClient();
    return await kc.deleteUser(u.integrations.kard.userId);
  } catch (err) {
    console.error('Error deleting kard user: ', err);
  }
};

const populateCompaniesOnTransactions = async (
  transactions: Partial<ITransaction & { _id: Types.ObjectId }>[],
): Promise<Partial<ITransaction & { _id: Types.ObjectId }>[]> => {
  const companies: { [key: string]: ICompanyDocument } = {};
  return Promise.all(
    transactions.map(async (t) => {
      let company = companies[t.company?.toString()];
      if (!company) {
        company = await CompanyModel.findById(t.company);
        companies[t.company.toString()] = company;
      }
      t.company = company;
      return t;
    }),
  );
};

export const queueSettledTransactions = async (
  user: IUserDocument | Types.ObjectId,
  transactions: Partial<ITransaction & { _id: Types.ObjectId }>[],
): Promise<AxiosResponse<{}, any> | void> => {
  try {
    if (!(user as IUserDocument)?.name) {
      user = await UserModel.findById(user);
    }
    const u = user as IUserDocument;
    if (!u?.integrations?.kard?.userId) {
      throw new Error('No kard integration object or invalid kard user id.');
    }

    // populate companies
    transactions = await populateCompaniesOnTransactions(transactions);

    // map to KardTransaction
    const req: QueueTransactionsRequest = transactions.map((t): Transaction => {
      const description = `Transaction with ${
        (t.company as ICompanyDocument)?.companyName
      } on ${t.date.toISOString()} for ${t.amount * CentsInUSD} USD cents`;
      return {
        transactionId: t.integrations?.kard?.id,
        referringPartnerUserId: u?.integrations?.kard?.userId,
        amount: t.amount * CentsInUSD,
        status: t?.integrations?.kard?.status,
        currency: t?.integrations?.plaid?.iso_currency_code,
        description,
        settledDate: t?.date?.toISOString(),
        merchantName: (t.company as ICompanyDocument)?.companyName,
        merchantId: (t.company as ICompanyDocument)?.mcc?.toString(),
        cardBIN: decrypt((t?.card as ICard)?.binToken),
        cardLastFour: decrypt((t?.card as ICard)?.lastFourDigitsToken),
      };
    });

    const kc = new KardClient();
    return kc.queueTransactionsForProcessing(req);
  } catch (err) {
    console.error('Error queuing transactions: ', err);
  }
};
