import dayjs from 'dayjs';
import { ObjectId, Types } from 'mongoose';
import { CompanyHideReasons, CompanyModel, ICompanyDocument } from '../models/company';
import { ITransactionDocument, TransactionModel } from '../models/transaction';
import { IUserDocument, UserEmailStatus, UserModel } from '../models/user';
import { getMonthStartDate } from '../services/impact/utils';
import { getRandomInt } from './number';

export const createSomeUsers = async (count: number): Promise<IUserDocument[]> => {
  const users: IUserDocument[] = [];
  for (let i = 0; i < count; i++) {
    const user = new UserModel();
    user.password = 'password';
    user.name = `Test User_${new Types.ObjectId().toString()}`;
    user.emails.push({
      email: `testemail_${new Types.ObjectId().toString()}@theimpactkarma.com`,
      primary: true,
      status: UserEmailStatus.Verified,
    });
    await user.save();
    users.push(user);
  }
  return users;
};

export const createATestCompany = async (): Promise<ICompanyDocument> => {
  const company = new CompanyModel();
  company.companyName = `Test Company_${new Types.ObjectId().toString}`;
  company.combinedScore = getRandomInt(-16, 16);
  company.createdAt = dayjs().subtract(1, 'week').toDate();
  company.hidden = { status: false, reason: CompanyHideReasons.None, lastModified: new Date() };
  return await company.save();
};

export const createSomeTransactions = async (
  count: number,
  userId: ObjectId,
  company: ICompanyDocument
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
  company: ICompanyDocument
): Promise<ITransactionDocument[]> => {
  // pick some dats accross the three months to use for creating mock transactions
  let dates: Date[] = [];

  for (let i = 0; i < numMonths; i++) {
    dates.push(getMonthStartDate(dayjs()).subtract(i, 'month').toDate());
    dates.push(getMonthStartDate(dayjs()).subtract(i, 'month').add(1, 'week').toDate());
    dates.push(getMonthStartDate(dayjs()).subtract(i, 'month').add(2, 'week').toDate());
  }

  return await Promise.all(
    dates.map(async (date) => {
      const transaction = new TransactionModel();
      transaction.date = date;
      transaction.user = user;
      transaction.amount = getRandomInt(1, 100);
      transaction.company = company;
      return await transaction.save();
    })
  );
};
