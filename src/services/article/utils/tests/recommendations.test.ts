import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import dayjs from 'dayjs';
import { Types } from 'mongoose';
import { MongoClient } from '../../../../clients/mongo';
import { kwSlugify } from '../../../../lib/slugify';
import {
  cleanUpDocuments,
  createSomeArticles,
  createSomeCompanies,
  createSomeTransactionsWithCompany,
  createSomeUsers,
} from '../../../../lib/testingUtils';
import { ArticleTypes, IArticleDocument } from '../../../../models/article';
import { ICompanyDocument } from '../../../../models/company';
import { ITransactionDocument } from '../../../../models/transaction';
import { IUserDocument } from '../../../../models/user';
import {
  getArticleRecommendationsBasedOnTransactionHistory,
  getCompaniesWithArticles,
  getCompaniesWithArticlesUserShopsAt,
  getMatchingTransactionCompaniesInDateRange,
} from '../recommendations';

describe('tests article recommendation logic', () => {
  let testUser: IUserDocument;
  let testUserThatPreviouslyReceivedTwoArticleEmails: IUserDocument;
  let testCompanies: ICompanyDocument[];
  let testArticles: IArticleDocument[];
  let testTransactions: ITransactionDocument[];

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db

    await cleanUpDocuments([
      ...testArticles,
      ...testCompanies,
      ...testTransactions,
      testUser,
      testUserThatPreviouslyReceivedTwoArticleEmails,
    ]);

    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();

    // creat two test companies
    testCompanies = await createSomeCompanies({
      companies: [
        {
          companyName: 'test company 1',
        },
        {
          companyName: 'test company 2',
        },
      ],
    });

    // create two artilces that reference the companies
    testArticles = await createSomeArticles({
      articles: [
        {
          company: testCompanies[0]._id,
          type: ArticleTypes.GoodAndBad,
          title: "test article 1 Intro Title's",
        },
        {
          company: testCompanies[1]._id,
          type: ArticleTypes.GoodAndBad,
          title: 'test article 2 Intro Title',
        },
      ],
    });

    [testUser, testUserThatPreviouslyReceivedTwoArticleEmails] = await createSomeUsers({
      users: [
        {},
        {
          articles: {
            queued: [
              { article: testArticles[0]._id, date: dayjs().toDate() },
              { article: testArticles[1]._id, date: dayjs().toDate() },
            ],
          },
        },
      ],
    });

    // create a transaction for each company
    testTransactions = [
      (await createSomeTransactionsWithCompany(1, testUser._id, testCompanies[0]))[0],
      (
        await createSomeTransactionsWithCompany(1, testUser._id, testCompanies[1], dayjs().subtract(2, 'week').toDate())
      )[0],
      (
        await createSomeTransactionsWithCompany(
          1,
          testUserThatPreviouslyReceivedTwoArticleEmails._id,
          testCompanies[0],
          dayjs().subtract(1, 'week').toDate(),
        )
      )[0],
      (
        await createSomeTransactionsWithCompany(
          1,
          testUserThatPreviouslyReceivedTwoArticleEmails._id,
          testCompanies[1],
          dayjs().subtract(1, 'week').toDate(),
        )
      )[0],
    ];
  });

  it('getCompaniesWithArticles returns companies that assiociated with articles', async () => {
    const companies = await getCompaniesWithArticles();
    expect(companies.length).toBeGreaterThanOrEqual(testCompanies.length);
    const companyNames = companies.map((c) => c.companyName);
    testCompanies
      .map((c) => c.companyName)
      .forEach((companyName) => {
        expect(companyNames).toContainEqual(companyName);
      });
  });

  it('getMatchingTransactionCompaniesInDateRage pulls user transactions with test company 1', async () => {
    const transactions = await getMatchingTransactionCompaniesInDateRange(testUser._id, [
      testCompanies[0]._id as unknown as Types.ObjectId,
    ]);
    expect(transactions.length).toBe(1);
    expect(transactions[0]._id.toString()).toBe(testCompanies[0]._id.toString());
  });

  it('getMatchingTransactionCompaniesInDateRage pulls user transactions with two test companies', async () => {
    const companies = await getMatchingTransactionCompaniesInDateRange(testUser._id, [
      testCompanies[0]._id as unknown as Types.ObjectId,
      testCompanies[1]._id as unknown as Types.ObjectId,
    ]);
    expect(companies.length).toBe(2);
    const companyIds = companies.map((t) => t._id.toString());
    testCompanies.forEach((company) => {
      expect(companyIds).toContainEqual(company._id.toString());
    });
  });

  it('getCompaniesWithArticlesUserShopsAt returns both test companies on passing just the test user id', async () => {
    const companiesUserShopsAtAndHaveArticles = await getCompaniesWithArticlesUserShopsAt(testUser._id);
    expect(companiesUserShopsAtAndHaveArticles.length).toBe(2);
    const companyIds = companiesUserShopsAtAndHaveArticles.map((c) => c._id.toString());
    const expectedCompanyIds = testCompanies.map((c) => c._id.toString());
    expectedCompanyIds.forEach((companyId) => {
      expect(companyIds).toContainEqual(companyId);
    });
  });

  it('getCompaniesWithArticlesUserShopsAt returns both test companies on passing just the test user id and start date that excludes transaction with second company', async () => {
    const companiesUserShopsAtAndHaveArticles = await getCompaniesWithArticlesUserShopsAt(
      testUser._id,
      dayjs().subtract(8, 'days').toDate(),
    );
    expect(companiesUserShopsAtAndHaveArticles).not.toBeNull();
    expect(companiesUserShopsAtAndHaveArticles.length).toBe(1);
    const companyIds = companiesUserShopsAtAndHaveArticles.map((c) => c._id.toString());
    expect(companyIds).toContainEqual(testCompanies[0]._id.toString());
    expect(companyIds).not.toContainEqual(testCompanies[1]._id.toString());
  });

  it('getCompaniesWithArticlesUserShopsAt returns both test companies on passing just the test user id and end date that excludes transaction with first company', async () => {
    const companiesUserShopsAtAndHaveArticles = await getCompaniesWithArticlesUserShopsAt(
      testUser._id,
      null,
      dayjs().subtract(8, 'days').toDate(),
    );
    expect(companiesUserShopsAtAndHaveArticles).not.toBeNull();
    expect(companiesUserShopsAtAndHaveArticles.length).toBe(1);
    const companyId = companiesUserShopsAtAndHaveArticles[0]._id.toString();
    expect(companyId).toBe(testCompanies[1]._id.toString());
  });

  it('getCompaniesWithArticlesUserShopsAt uses the provided company list when available', async () => {
    const companiesUserShopsAtAndHaveArticles = await getCompaniesWithArticlesUserShopsAt(testUser._id, null, null, [
      testCompanies[0],
    ]);
    expect(companiesUserShopsAtAndHaveArticles).not.toBeNull();
    expect(companiesUserShopsAtAndHaveArticles.length).toBe(1);
    const companyId = companiesUserShopsAtAndHaveArticles[0]._id.toString();
    expect(companyId).toBe(testCompanies[0]._id.toString());
  });

  it('getArticleRecommendationsBasedOnTransactionHistory returns two article urls for the test user', async () => {
    const urls = await getArticleRecommendationsBasedOnTransactionHistory(testUser);
    expect(urls).not.toBeNull();
    expect(urls.length).toBe(2);
    expect(urls).toContainEqual(
      `https://karmawallet.io/industry-report/${ArticleTypes.GoodAndBad}/${kwSlugify(
        testCompanies[0].companyName,
      )}/${kwSlugify(testArticles[0].title)}/${testArticles[0]._id}`,
    );
    expect(urls).toContainEqual(
      `https://karmawallet.io/industry-report/${ArticleTypes.GoodAndBad}/${kwSlugify(testCompanies[1].companyName)}/${[
        kwSlugify(testArticles[1].title),
      ]}/${testArticles[1]._id}`,
    );
  });

  it('getArticleRecommendationsBasedOnTransactionHistory doesnt output urls if the user has already received the corresponding article', async () => {
    const urls = await getArticleRecommendationsBasedOnTransactionHistory(
      testUserThatPreviouslyReceivedTwoArticleEmails,
    );
    expect(urls).not.toBeNull();
    expect(urls.length).toBe(0);
  });

  it('getArticleRecommendationsBasedOnTransactionHistory expects output urls even if the user has already received the corresponding article if they were queued within the date range', async () => {
    const urls = await getArticleRecommendationsBasedOnTransactionHistory(
      testUserThatPreviouslyReceivedTwoArticleEmails,
      dayjs().subtract(8, 'days').toDate(),
      dayjs().toDate(),
    );
    expect(urls).not.toBeNull();
    expect(urls.length).toBe(2);
  });
});
