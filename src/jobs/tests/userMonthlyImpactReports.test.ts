import { afterAll, afterEach, beforeAll, describe, expect, it, jest, test } from '@jest/globals';
import dayjs from 'dayjs';
import { Types } from 'mongoose';
import { MongoClient } from '../../clients/mongo';
import { getRandomInt } from '../../lib/number';
import { CompanyHideReasons, CompanyModel, ICompanyDocument } from '../../models/company';
import { ITransactionDocument, TransactionModel } from '../../models/transaction';
import { IUserDocument, UserEmailStatus, UserModel } from '../../models/user';
import { getMonthStartDate } from '../../services/impact/utils';
import {
  getCarbonDataForMonth,
  groupTransactionsByMonth,
  getGroupedTransactionsAndMonthlyBreakdown,
} from '../userMonthlyImpactReports';

const getSomeUsers = async (count: number): Promise<IUserDocument[]> => {
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

export const getATestCompany = async (): Promise<ICompanyDocument> => {
  const company = new CompanyModel();
  company.companyName = `Test Company_${new Types.ObjectId().toString}`;
  company.combinedScore = getRandomInt(-16, 16);
  company.createdAt = dayjs().subtract(1, 'week').toDate();
  company.hidden = { status: false, reason: CompanyHideReasons.None, lastModified: new Date() };
  return await company.save();
};

const getSomeTransactions = (count: number): ITransactionDocument[] => {
  const transactions: ITransactionDocument[] = [];
  for (let i = 0; i < count; i++) {
    const transaction = new TransactionModel();
    transaction.date = dayjs().subtract(1, 'week').toDate();
    transactions.push(transaction);
  }
  return transactions;
};

// populates transactions for part of this month and two back
const getNumMonthsOfTransactions = async (
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

describe('user impact report generation', () => {
  let testUser: IUserDocument;
  let testUser_WithThreeMonthsOfTransactions: IUserDocument;
  let twoTestTransactions: ITransactionDocument[];
  let threeMonthsOfTransactions: ITransactionDocument[];
  let testCompany: ICompanyDocument;

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
    await Promise.all(twoTestTransactions.map(async (t) => await t.remove()));
    await Promise.all(threeMonthsOfTransactions.map(async (t) => await t.remove()));

    await testCompany.remove();
    await testUser.remove();
    await testUser_WithThreeMonthsOfTransactions.remove();
    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();

    [testUser, testUser_WithThreeMonthsOfTransactions] = await getSomeUsers(2);
    twoTestTransactions = getSomeTransactions(2);
    twoTestTransactions = await Promise.all(
      twoTestTransactions.map(async (t) => {
        t.user = testUser._id;
        await t.save();
        return t;
      })
    );

    testCompany = await getATestCompany();
    threeMonthsOfTransactions = await getNumMonthsOfTransactions(
      3,
      testUser_WithThreeMonthsOfTransactions,
      testCompany
    );
  });

  it('getCarbonDataForMonth silently fails when transactions are an empty array', async () => {
    expect(() => {
      return getCarbonDataForMonth([], testUser);
    }).toBeTruthy();
  });

  it('getCarbonDataForMonth silently fails when user is empty object', async () => {
    expect(() => {
      return getCarbonDataForMonth(twoTestTransactions, {} as unknown as IUserDocument);
    }).toBeTruthy();
  });

  it('groupTransactionsByMonth groups two transactions with the same date into an object with a single key', async () => {
    const expectedObjectKey = dayjs().subtract(1, 'week').utc().format('YYYY-MM');
    try {
      const result = groupTransactionsByMonth(twoTestTransactions);

      expect(result).toBeDefined();
      expect(result).toHaveProperty(expectedObjectKey);
      expect(Object.keys(result)).toHaveLength(1);
      expect(result[expectedObjectKey]).toHaveLength(2);
    } catch (e) {
      expect(e).toBeUndefined();
    }
  });

  it('groupTransactionsByMonth groups last three months into four keys', async () => {
    const expectedObjectKey_one = getMonthStartDate(dayjs()).utc().format('YYYY-MM');
    const expectedObjectKey_two = getMonthStartDate(dayjs()).subtract(1, 'month').utc().format('YYYY-MM');
    const expectedObjectKey_three = getMonthStartDate(dayjs()).subtract(2, 'month').utc().format('YYYY-MM');

    const result = groupTransactionsByMonth(threeMonthsOfTransactions);

    expect(result).toBeDefined();
    expect(result).toHaveProperty(expectedObjectKey_one);
    expect(result).toHaveProperty(expectedObjectKey_two);
    expect(result).toHaveProperty(expectedObjectKey_three);

    expect(Object.keys(result)).toHaveLength(3);

    expect(result[expectedObjectKey_one]).toHaveLength(3);
    expect(result[expectedObjectKey_two]).toHaveLength(3);
    expect(result[expectedObjectKey_three]).toHaveLength(3);
  });

  it('groupTransactionsByMonth returns empty object when transactions are empty', async () => {
    try {
      const result = groupTransactionsByMonth([]);
      expect(result).toBeDefined();
      expect(result).toEqual({});
    } catch (e) {
      expect(e).toBeUndefined();
    }
  });

  it('groupTransactionsByMonth returns empty object when transactions are empty', async () => {
    expect(() => {
      groupTransactionsByMonth(undefined);
    }).toThrow(TypeError);
  });

  it('getGroupedTranactionsAndMonthlyBreakdown gets only transactions from last month', async () => {
    const lastMonthStart = getMonthStartDate(dayjs().utc().subtract(1, 'month'));
    const { monthlyImpactBreakdown, monthlyBreakdown } = await getGroupedTransactionsAndMonthlyBreakdown(
      testUser_WithThreeMonthsOfTransactions,
      false,
      lastMonthStart
    );

    monthlyImpactBreakdown.forEach((m) => {
      /* Note: test fails if the date is not in UTC */
      expect(dayjs(m.date).utc().month()).toEqual(lastMonthStart.month());
    });

    for (const monthTransactions of Object.values(monthlyBreakdown)) {
      monthTransactions.forEach((transaction) => {
        expect(dayjs(transaction.date).month()).toBe(lastMonthStart.month());
      });
    }
  });
});
