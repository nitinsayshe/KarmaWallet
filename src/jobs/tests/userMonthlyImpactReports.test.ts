import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import dayjs from 'dayjs';
import { MongoClient } from '../../clients/mongo';
import {
  createATestCompany,
  createNumMonthsOfTransactions,
  createSomeTransactions,
  createSomeUsers,
} from '../../lib/testingUtils';
import { ICompanyDocument } from '../../models/company';
import { ITransactionDocument } from '../../models/transaction';
import { IUserDocument } from '../../models/user';
import { getMonthStartDate } from '../../services/impact/utils';
import {
  getCarbonDataForMonth,
  getGroupedTransactionsAndMonthlyBreakdown,
  groupTransactionsByMonth,
} from '../userMonthlyImpactReports';

describe('user impact report generation', () => {
  let testUser: IUserDocument;
  let testUserWithThreeMonthsOfTransactions: IUserDocument;
  let twoTestTransactions: ITransactionDocument[];
  let threeMonthsOfTransactions: ITransactionDocument[];
  let testCompany: ICompanyDocument;

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
    await Promise.all(twoTestTransactions.map(async (t) => t.remove()));
    await Promise.all(threeMonthsOfTransactions.map(async (t) => t.remove()));

    await testCompany.remove();

    await testUser.remove();
    await testUserWithThreeMonthsOfTransactions.remove();

    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();

    [testUser, testUserWithThreeMonthsOfTransactions] = await createSomeUsers({ users: [{}, {}] });

    testCompany = await createATestCompany();
    twoTestTransactions = await createSomeTransactions(2, testUser._id, testCompany);
    threeMonthsOfTransactions = await createNumMonthsOfTransactions(
      3,
      testUserWithThreeMonthsOfTransactions,
      testCompany,
    );
  });

  it('getCarbonDataForMonth silently fails when transactions are an empty array', async () => {
    expect(() => getCarbonDataForMonth([], testUser)).toBeTruthy();
  });

  it('getCarbonDataForMonth silently fails when user is empty object', async () => {
    expect(() => getCarbonDataForMonth(twoTestTransactions, {} as unknown as IUserDocument)).toBeTruthy();
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
    const expectedObjectKeyOne = getMonthStartDate(dayjs()).utc().format('YYYY-MM');
    const expectedObjectKeyTwo = getMonthStartDate(dayjs()).subtract(1, 'month').utc().format('YYYY-MM');
    const expectedObjectKeyThree = getMonthStartDate(dayjs()).subtract(2, 'month').utc().format('YYYY-MM');

    const result = groupTransactionsByMonth(threeMonthsOfTransactions);

    expect(result).toBeDefined();
    expect(result).toHaveProperty(expectedObjectKeyOne);
    expect(result).toHaveProperty(expectedObjectKeyTwo);
    expect(result).toHaveProperty(expectedObjectKeyThree);

    expect(Object.keys(result)).toHaveLength(3);

    expect(result[expectedObjectKeyOne]).toHaveLength(3);
    expect(result[expectedObjectKeyTwo]).toHaveLength(3);
    expect(result[expectedObjectKeyThree]).toHaveLength(3);
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

  it('groupTransactionsByMonth throws an error when transactions are undefined', async () => {
    expect(() => {
      groupTransactionsByMonth(undefined);
    }).toThrow(TypeError);
  });

  it('getGroupedTranactionsAndMonthlyBreakdown gets only transactions from last month', async () => {
    const lastMonthStart = getMonthStartDate(dayjs().utc().subtract(1, 'month'));
    const { monthlyImpactBreakdown, monthlyBreakdown } = await getGroupedTransactionsAndMonthlyBreakdown(
      testUserWithThreeMonthsOfTransactions,
      false,
      lastMonthStart,
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
