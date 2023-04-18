import dayjs from 'dayjs';
import { ObjectId, Types } from 'mongoose';
import { CardModel, ICardDocument } from '../models/card';
import { CompanyHideReasons, CompanyModel, ICompanyDocument } from '../models/company';
import { IPromoDocument, IPromoTypes, PromoModel } from '../models/promo';
import { ITransactionDocument, TransactionModel } from '../models/transaction';
import { IUserDocument, UserEmailStatus, UserModel } from '../models/user';
import { getMonthStartDate } from '../services/impact/utils';
import { CardStatus } from './constants';
import { getRandomInt } from './number';

export type CreateTestUsersRequest = {
  users?: Partial<IUserDocument>[];
};

export type CreateTestPromosRequest = {
  promos?: Partial<IPromoDocument>[];
};

export type CreateTestCardsRequest = {
  cards?: Partial<ICardDocument>[];
};

export const createSomeUsers = async (req: CreateTestUsersRequest): Promise<IUserDocument[]> => (await Promise.all(
  req.users.map(async (user) => {
    const newUser = new UserModel();
    newUser.password = user?.password || 'password';
    newUser.name = user?.name || `Test User_${new Types.ObjectId().toString()}`;
    newUser.emails = user?.emails || [];
    if (newUser.emails.length === 0) {
      newUser.emails.push({
        email: `testemail_${new Types.ObjectId().toString()}@theimpactkarma.com`,
        primary: true,
        status: UserEmailStatus.Verified,
      });
    }
    newUser.integrations = user.integrations;
    return newUser.save();
  }),
)) || [];

export const createSomePromos = async (req: CreateTestPromosRequest): Promise<IPromoDocument[]> => (await Promise.all(
  req.promos.map(async (promo) => {
    const newPromo = new PromoModel();
    newPromo.amount = promo?.amount || 10;
    newPromo.name = promo?.name || `Test PROMO_${new Types.ObjectId().toString()}`;
    newPromo.events = promo?.events || [];
    newPromo.type = promo?.type || IPromoTypes.OTHER;
    newPromo.promoText = promo?.promoText || `Test PROMO_TEXT_${new Types.ObjectId().toString()}`;
    newPromo.successText = promo?.successText || `Test PROMO_SUCCESS_${new Types.ObjectId().toString()}`;
    newPromo.disclaimerText = promo?.disclaimerText || `Test PROMO_DISCLAIMER_${new Types.ObjectId().toString()}`;
    newPromo.headerText = promo?.headerText || 'Test PROMO_HEADER_TEXT_{new Types.ObjectId().toString()}';
    return newPromo.save();
  }),
)) || [];

export const createSomeCards = async (req: CreateTestCardsRequest): Promise<ICardDocument[]> => (await Promise.all(
  req.cards.map(async (card) => {
    const newCard = new CardModel();
    newCard.userId = card?.userId || undefined;
    newCard.status = card?.status || CardStatus.Linked;
    newCard.unlinkedDate = card?.unlinkedDate || undefined;
    newCard.removedDate = card?.removedDate || undefined;
    newCard.lastModified = card?.lastModified || undefined;
    newCard.name = card?.name || `Test Card_${new Types.ObjectId().toString()}`;
    return newCard.save();
  }),
)) || [];
export const createATestCompany = async (): Promise<ICompanyDocument> => {
  const company = new CompanyModel();
  company.companyName = `Test Company_${new Types.ObjectId().toString}`;
  company.combinedScore = getRandomInt(-16, 16);
  company.createdAt = dayjs().subtract(1, 'week').toDate();
  company.hidden = { status: false, reason: CompanyHideReasons.None, lastModified: new Date() };
  return company.save();
};

export const createSomeTransactions = async (
  count: number,
  userId: ObjectId,
  company: ICompanyDocument,
): Promise<ITransactionDocument[]> => {
  const transactions: ITransactionDocument[] = [];
  for (let i = 0; i < count; i++) {
    const transaction = new TransactionModel();
    transaction.date = dayjs().subtract(1, 'week').toDate();
    transaction.user = userId;
    transaction.company = company;
    transaction.amount = getRandomInt(1, 100);
    await transaction.save();
    transactions.push(transaction);
  }
  return transactions;
};

// populates transactions for part of this month and two back
export const createNumMonthsOfTransactions = async (
  numMonths: number,
  user: IUserDocument,
  company: ICompanyDocument,
): Promise<ITransactionDocument[]> => {
  // pick some dats accross the three months to use for creating mock transactions
  const dates: Date[] = [];

  for (let i = 0; i < numMonths; i++) {
    dates.push(getMonthStartDate(dayjs()).subtract(i, 'month').toDate());
    dates.push(getMonthStartDate(dayjs()).subtract(i, 'month').add(1, 'week').toDate());
    dates.push(getMonthStartDate(dayjs()).subtract(i, 'month').add(2, 'week').toDate());
  }

  return Promise.all(
    dates.map(async (date) => {
      const transaction = new TransactionModel();
      transaction.date = date;
      transaction.user = user;
      transaction.amount = getRandomInt(1, 100);
      transaction.company = company;
      return transaction.save();
    }),
  );
};
