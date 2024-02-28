import argon2 from 'argon2';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { Types } from 'mongoose';
import { TransactionPaymentChannelEnum, TransactionTransactionTypeEnum } from 'plaid';
import { deleteUser } from '.';
import { MainBullClient } from '../../clients/bull/main';
import { IMatchedTransaction } from '../../integrations/plaid/types';
import {
  getCompanyPrimarySectorDictionary,
  getPlaidCategoryMappingDictionary,
} from '../../integrations/plaid/v2_matching';
import { saveTransactions } from '../../integrations/plaid/v2_transaction';
import { CardStatus, KardEnrollmentStatus, UserRoles } from '../../lib/constants';
import { JobNames } from '../../lib/constants/jobScheduler';
import { encrypt } from '../../lib/encryption';
import { saveDocuments } from '../../lib/model';
import { getRandomInt } from '../../lib/number';
import { createSomeCards, createSomeUsers } from '../../lib/testingUtils';
import { CardModel, ICardDocument } from '../../models/card';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { IUserDocument, UserModel } from '../../models/user';
import { IRequest } from '../../types/request';
import { CardResponse } from '../../clients/marqeta/types';
import { UserEmailStatus } from '../../models/user/types';

export enum TestIdentities {
  HenryDavidThoreau = 'HenryDavidThoreau',
  RachelCarson = 'RachelCarson',
  GeorgeWashingtonCarver = 'GeorgeWashingtonCarver',
  ChicoMenendes = 'ChicoMenendes',
}

// skip the whole plaid interaction and just mock the call to the function that creates transactions
export const mockIncomingPlaidTransactions = async (
  transactions: Partial<
  IMatchedTransaction & {
    companyDocument: ICompanyDocument;
    userId: string;
    card: ICardDocument;
  }
  >[],
): Promise<void> => {
  const primarySectorDictionary = await getCompanyPrimarySectorDictionary();
  const plaidMappingSectorDictionary = await getPlaidCategoryMappingDictionary();
  await Promise.all(
    transactions.map(
      async (
        transaction: Partial<
        IMatchedTransaction & {
          companyDocument: ICompanyDocument;
          userId: string;
          card: ICardDocument;
        }
        >,
      ) => {
        if (!transaction.companyDocument || !transaction.userId || !transaction.card) {
          throw new Error('Missing required fields');
        }
        try {
          const newTransactions: IMatchedTransaction[] = [
            {
              transaction_type: transaction.transaction_type || TransactionTransactionTypeEnum.Digital,
              pending_transaction_id: transaction.pending_transaction_id || null,
              category_id: transaction.category_id || null,
              category: transaction.category || ['Service', 'Subscription'],
              location: transaction.location || {
                address: null,
                city: null,
                region: null,
                postal_code: null,
                store_number: null,
                country: null,
                lat: null,
                lon: null,
              },
              payment_meta: transaction.payment_meta || {
                by_order_of: null,
                payee: null,
                payer: null,
                payment_method: null,
                payment_processor: null,
                ppd_id: null,
                reason: null,
                reference_number: null,
              },
              account_owner: transaction.account_owner || null,
              name: transaction.name || 'Online Purchase',
              original_description: transaction.original_description || null,
              account_id: transaction.account_id || new Types.ObjectId().toString(),
              amount: transaction.amount || getRandomInt(10, 500),
              iso_currency_code: transaction.iso_currency_code || 'USD',
              unofficial_currency_code: transaction.unofficial_currency_code || null,
              date: transaction.date || dayjs().subtract(1, 'week').format('YYYY-MM-DD'),
              pending: transaction.pending || false,
              transaction_id: transaction.transaction_id || new Types.ObjectId().toString(),
              merchant_name: transaction.merchant_name || transaction.companyDocument?.companyName,
              check_number: null,
              payment_channel: transaction.payment_channel || TransactionPaymentChannelEnum.Online,
              authorized_date: transaction.authorized_date || dayjs().subtract(1, 'week').format('YYYY-MM-DD'),
              authorized_datetime:
                transaction.authorized_datetime || dayjs().subtract(1, 'week').format('YYYY-MM-DDTHH:mm:ssZ[Z]'),
              datetime: transaction.datetime || null,
              transaction_code: transaction.transaction_code || null,
              personal_finance_category: transaction.personal_finance_category || null,
              company: transaction.companyDocument?._id || undefined,
            },
          ];
          await saveTransactions(
            newTransactions,
            transaction.userId,
            primarySectorDictionary,
            plaidMappingSectorDictionary,
            transaction.card?._id,
          );
          return transaction;
        } catch (err) {
          console.log(err);
        }
      },
    ),
  );
};

const createTestUsers = async (): Promise<IUserDocument[]> => {
  try {
    const users: (Partial<IUserDocument> | IUserDocument)[] = [
      {
        name: 'Henry David Thoreau',
        emails: [
          {
            email: 'hthoreau@karmawallet.com',
            primary: true,
            status: UserEmailStatus.Verified,
          },
        ],
        zipcode: '01741',
        role: UserRoles.None,
        isTestIdentity: true,
        password: await argon2.hash('Walden1854!'),
      },
      {
        name: 'Rachel Carson',
        emails: [
          {
            email: 'rcarson@karmawallet.com',
            primary: true,
            status: UserEmailStatus.Verified,
          },
        ],
        zipcode: '04556',
        role: UserRoles.None,
        isTestIdentity: true,
        password: await argon2.hash('SilentSpring1962@'),
      },
      {
        name: 'George Washington Carver',
        emails: [
          {
            email: 'gwcarver@karmawallet.com',
            primary: true,
            status: UserEmailStatus.Verified,
          },
        ],
        zipcode: '64755',
        role: UserRoles.None,
        isTestIdentity: true,
        password: await argon2.hash('CropRotation1930s#'),
      },
      {
        name: 'Chico Mendes',
        emails: [
          {
            email: 'cmendes@karmawallet.com',
            primary: true,
            status: UserEmailStatus.Verified,
          },
        ],
        zipcode: '69980',
        role: UserRoles.None,
        isTestIdentity: true,
        password: await argon2.hash('SaveTheRainforest1988$'),
      },
    ];

    return await createSomeUsers({ users });
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const getCompaniesByName = async (names: string[]): Promise<ICompanyDocument[]> => {
  try {
    const companies = await CompanyModel.find({ companyName: { $in: names } });
    if (!companies) {
      throw new Error(`Error getting companies ${names}`);
    }
    return names.map((name) => companies.find((company) => company.companyName === name));
  } catch (err) {
    console.error(err);
    return null;
  }
};
const getCompanyByName = async (companyName: string): Promise<ICompanyDocument> => {
  try {
    const company = await CompanyModel.findOne({ companyName });
    if (!company) {
      throw new Error(`Company ${companyName} not found`);
    }
    return company;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getTestIdentities = async (): Promise<IUserDocument[]> => {
  try {
    const users = await UserModel.find({ isTestIdentity: true });
    if (!users || users.length === 0) {
      throw new Error('No test identities found');
    }
    return users;
  } catch (err) {
    console.error(err);
    return [];
  }
};

const dropTestIdentityPlaidIntegration = async (card: ICardDocument): Promise<void> => {
  try {
    if (!card) {
      throw new Error('No card provided');
    }
    if (!!card.integrations) {
      card.integrations.plaid = undefined;
    }
    await card.save();
  } catch (err) {
    console.error(err);
  }
};

export const deleteTestIdentites = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot modify test identities in non-test environment');
  }
  try {
    const testUsers = await getTestIdentities();
    if (!testUsers || testUsers.length === 0) {
      throw new Error('No test identities found');
    }
    await Promise.all(
      testUsers.map(async (user) => {
        try {
          // get any user cards
          const cards = await CardModel.find({ userId: user._id });
          // drop fake plaid integration to avoid hitting plaid
          await Promise.all(cards.map(async (card) => dropTestIdentityPlaidIntegration(card)));

          const mockRequest = {
            query: { userId: user._id.toString() },
          } as IRequest<{}, { userId: string }, {}>;
          await deleteUser(mockRequest);
          console.log(`Successfully deleted user ${user.name}`);
        } catch (err) {
          console.error(err);
        }
      }),
    );
  } catch (err) {
    console.error(err);
  }
};

type TestUserDocuments = {
  henry: IUserDocument;
  rachel: IUserDocument;
  george: IUserDocument;
  chico: IUserDocument;
};

const createTestCards = async (
  users: Partial<TestUserDocuments>,
): Promise<{
  henrysCard: ICardDocument;
  georgesCard: ICardDocument;
  chicosCard: ICardDocument;
} | null> => {
  try {
    const { henry, george, chico } = users;
    const masks = {
      henry: `7${getRandomInt(100, 999)}`,
      george: `5${getRandomInt(100, 999)}`,
      chico: `4${getRandomInt(100, 999)}`,
    };
    const [henrysCard, georgesCard, chicosCard] = await createSomeCards({
      cards: [
        {
          userId: henry._id,
          status: CardStatus.Linked,
          name: 'Adv Checking',
          subtype: 'checking',
          type: 'depository',
          institution: 'EarthFirst Financial',
          integrations: {
            plaid: {
              accessToken: 'access-sandbox-test',
              accountId: 'account-sandbox-test',
              items: ['item-sandbox-test'],
              publicToken: 'public-sandbox-test',
              linkSessionId: 'link-session-sandbox-test',
              institutionId: 'ins_test',
              unlinkedAccessTokens: [],
            },
            kard: {
              createdOn: dayjs().toDate(),
              userId: randomUUID(),
              enrollmentStatus: KardEnrollmentStatus.Enrolled,
            },
          },
          createdOn: dayjs().subtract(3, 'month').toDate(),
          lastModified: dayjs().subtract(2, 'week').toDate(),
          mask: masks.henry,
          lastFourDigitsToken: encrypt(masks.henry),
          binToken: encrypt(`4${getRandomInt(10000, 99999)}`),
        },
        {
          userId: george._id,
          status: CardStatus.Linked,
          name: 'Adv Checking',
          subtype: 'checking',
          type: 'depository',
          institution: 'GreenLeaf Asset Management',
          integrations: {
            plaid: {
              accessToken: 'access-sandbox-test',
              accountId: 'account-sandbox-test',
              items: ['item-sandbox-test'],
              publicToken: 'public-sandbox-test',
              linkSessionId: 'link-session-sandbox-test',
              institutionId: 'ins_test',
              unlinkedAccessTokens: [],
            },
          },
          createdOn: dayjs().subtract(3, 'month').toDate(),
          lastModified: dayjs().subtract(3, 'month').toDate(),
          mask: masks.george,
          lastFourDigitsToken: encrypt(masks.george),
          binToken: encrypt(`5${getRandomInt(10000, 99999)}`),
        },
        {
          userId: chico._id,
          status: CardStatus.Removed,
          name: 'Adv Checking',
          subtype: 'checking',
          type: 'depository',
          institution: 'EverGreen Investments',
          integrations: {
            plaid: {
              accessToken: 'access-sandbox-test',
              accountId: 'account-sandbox-test',
              items: ['item-sandbox-test'],
              publicToken: 'public-sandbox-test',
              linkSessionId: 'link-session-sandbox-test',
              institutionId: 'ins_test',
              unlinkedAccessTokens: ['unlinked-access-token-123'],
            },
            kard: {
              createdOn: dayjs().toDate(),
              userId: randomUUID(),
              enrollmentStatus: KardEnrollmentStatus.Enrolled,
            },
          },
          createdOn: dayjs().subtract(3, 'month').toDate(),
          removedDate: dayjs().subtract(1, 'week').toDate(),
          lastModified: dayjs().subtract(1, 'week').toDate(),
          mask: masks.chico,
          lastFourDigitsToken: encrypt(masks.chico),
          binToken: encrypt(`4${getRandomInt(10000, 99999)}`),
        },
      ],
    });
    if (!henrysCard || !georgesCard || !chicosCard) {
      throw new Error('Could not create test cards');
    }
    return { henrysCard, georgesCard, chicosCard };
  } catch (err) {
    console.error(err);
    return null;
  }
};

const addTransactionsWithCompanyForUserFromEndDate = (
  company: ICompanyDocument,
  userId: string,
  card: ICardDocument,
  endDate: Date,
  numTransactions: number = 10,
): Partial<
IMatchedTransaction & {
  companyDocument: ICompanyDocument;
  userId: string;
  card: ICardDocument;
}
>[] => {
  const transactions: Partial<
  IMatchedTransaction & {
    companyDocument: ICompanyDocument;
    userId: string;
    card: ICardDocument;
  }
  >[] = [];

  for (let i = 0; i < numTransactions; i++) {
    transactions.push({
      userId: userId.toString(),
      card: card as any as CardResponse & ICardDocument,
      companyDocument: company,
      date: dayjs(endDate).subtract(i, 'day').format('YYYY-MM-DD'),
      authorized_date: dayjs(endDate).subtract(i, 'day').format('YYYY-MM-DD'),
      authorized_datetime: dayjs(endDate).subtract(i, 'day').format('YYYY-MM-DD'),
      name: company.companyName,
      datetime: dayjs(endDate).subtract(i, 'day').format('YYYY-MM-DDTHH:mm:ssZ[Z]'),
    });
  }
  return transactions;
};

const addTransactionsWithCompanyForUserFromStartDate = (
  company: ICompanyDocument,
  userId: string,
  card: ICardDocument,
  startDate: Date,
  numTransactions: number = 10,
): Partial<
IMatchedTransaction & {
  companyDocument: ICompanyDocument;
  userId: string;
  card: ICardDocument;
}
>[] => {
  const transactions: Partial<
  IMatchedTransaction & {
    companyDocument: ICompanyDocument;
    userId: string;
    card: ICardDocument;
  }
  >[] = [];
  for (let i = 0; i < numTransactions; i++) {
    transactions.push({
      userId,
      card: card as any as CardResponse & ICardDocument,
      companyDocument: company,
      date: dayjs(startDate).add(i, 'day').format('YYYY-MM-DD'),
      authorized_date: dayjs(startDate).add(i, 'day').format('YYYY-MM-DD'),
      authorized_datetime: dayjs(startDate).add(i, 'day').format('YYYY-MM-DD'),
      name: company.companyName,
      datetime: dayjs(startDate).add(i, 'day').format('YYYY-MM-DDTHH:mm:ssZ[Z]'),
    });
  }
  return transactions;
};

export const createTestTransactions = async (
  userId: Types.ObjectId,
  card: ICardDocument,
  companies: ICompanyDocument[],
  startDate: Date = dayjs().startOf('month').toDate(),
  endDate: Date = dayjs().toDate(),
): Promise<void> => {
  try {
    if (!companies?.length) {
      throw new Error('No companies provided');
    }

    const transactions: Partial<
    IMatchedTransaction & {
      companyDocument: ICompanyDocument;
      userId: string;
      card: ICardDocument;
    }
    >[] = [];
    companies.forEach((company) => {
      transactions.push(
        ...addTransactionsWithCompanyForUserFromStartDate(company, userId.toString(), card, startDate, 2),
      );
      transactions.push(...addTransactionsWithCompanyForUserFromEndDate(company, userId.toString(), card, endDate, 2));
    });

    /* await mockIncomingPlaidTransactions(transactions); */
    console.log('successfully created transactions...');
  } catch (err) {
    console.error(err);
  }
};

export const createTransactionsWithWalmartAndAmazonThisMonth = async (
  userId: Types.ObjectId,
  card: ICardDocument,
): Promise<void> => {
  try {
    const [walmart, amazon] = await getCompaniesByName(['Walmart', 'Amazon']);
    if (!walmart || !amazon) {
      throw new Error('Could not find Walmart or Amazon');
    }
    await createTestTransactions(userId, card, [walmart, amazon]);
  } catch (err) {
    console.error(err);
  }
};

export const createHenrysTransactions = async (userId: Types.ObjectId, card: ICardDocument): Promise<void> => {
  try {
    // george shopped a lot at Apple and World Wrestling Entertainment last month
    const threeMonthsAgoStartDate = dayjs().subtract(3, 'month').startOf('month').toDate();
    const twoMonthsAgoStartDate = dayjs().subtract(2, 'month').startOf('month').toDate();
    const lastMonthStartDate = dayjs().subtract(1, 'month').startOf('month').toDate();
    const lastMonthEndDate = dayjs().subtract(1, 'month').endOf('month').toDate();

    const [walmart, amazon, betterWorldBooks, bluebirdBotanicals, chalk, dollarGeneral] = await getCompaniesByName([
      'Walmart',
      'Amazon',
      'Better World Books',
      'Bluebird Botanicals',
      'Chalk Cybersecurity',
      'Dollar General',
    ]);

    if (!walmart || !amazon || !betterWorldBooks || !bluebirdBotanicals || !chalk || !dollarGeneral) {
      throw new Error('Error retrieving companies');
    }

    addTransactionsWithCompanyForUserFromStartDate(chalk, userId.toString(), card, lastMonthStartDate);
    addTransactionsWithCompanyForUserFromStartDate(chalk, userId.toString(), card, twoMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromStartDate(chalk, userId.toString(), card, threeMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromStartDate(bluebirdBotanicals, userId.toString(), card, lastMonthStartDate);
    addTransactionsWithCompanyForUserFromStartDate(amazon, userId.toString(), card, twoMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromStartDate(amazon, userId.toString(), card, threeMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromStartDate(betterWorldBooks, userId.toString(), card, lastMonthStartDate);
    addTransactionsWithCompanyForUserFromStartDate(betterWorldBooks, userId.toString(), card, twoMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromStartDate(betterWorldBooks, userId.toString(), card, threeMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromEndDate(walmart, userId.toString(), card, lastMonthEndDate);
    addTransactionsWithCompanyForUserFromEndDate(walmart, userId.toString(), card, twoMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromEndDate(walmart, userId.toString(), card, threeMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromEndDate(dollarGeneral, userId.toString(), card, lastMonthEndDate);
    addTransactionsWithCompanyForUserFromEndDate(dollarGeneral, userId.toString(), card, twoMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromEndDate(dollarGeneral, userId.toString(), card, threeMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromEndDate(amazon, userId.toString(), card, lastMonthEndDate);
    addTransactionsWithCompanyForUserFromEndDate(bluebirdBotanicals, userId.toString(), card, twoMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromEndDate(bluebirdBotanicals, userId.toString(), card, threeMonthsAgoStartDate);

    /* await mockIncomingPlaidTransactions(transactions); */
    console.log("successfully created henry's transactions...");
  } catch (err) {
    console.error(err);
  }
};

export const createGeorgesTransactions = async (userId: Types.ObjectId, card: ICardDocument): Promise<void> => {
  try {
    // george shopped a lot at Apple and World Wrestling Entertainment last month
    const lastMonthStartDate = dayjs().subtract(1, 'month').startOf('month').toDate();
    const lastMonthEndDate = dayjs().subtract(1, 'month').endOf('month').toDate();
    const threeMonthsAgoStartDate = dayjs().subtract(3, 'month').startOf('month').toDate();
    const twoMonthsAgoStartDate = dayjs().subtract(2, 'month').startOf('month').toDate();

    const [apple, coffee, betterWorldBooks, bluebirdBotanicals, amazon, dollarGeneral] = await getCompaniesByName([
      'Apple',
      '802 Coffee',
      'Better World Books',
      'Bluebird Botanicals',
      'Amazon',
      'Dollar General',
    ]);

    if (!apple || !coffee || !betterWorldBooks || !bluebirdBotanicals || !amazon || !dollarGeneral) {
      throw new Error('Error retrieving companies');
    }

    addTransactionsWithCompanyForUserFromStartDate(bluebirdBotanicals, userId.toString(), card, lastMonthStartDate);
    addTransactionsWithCompanyForUserFromStartDate(bluebirdBotanicals, userId.toString(), card, twoMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromStartDate(
      bluebirdBotanicals,
      userId.toString(),
      card,
      threeMonthsAgoStartDate,
    );
    addTransactionsWithCompanyForUserFromStartDate(amazon, userId.toString(), card, lastMonthStartDate);
    addTransactionsWithCompanyForUserFromStartDate(amazon, userId.toString(), card, twoMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromStartDate(amazon, userId.toString(), card, threeMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromStartDate(dollarGeneral, userId.toString(), card, lastMonthStartDate);
    addTransactionsWithCompanyForUserFromStartDate(dollarGeneral, userId.toString(), card, twoMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromStartDate(dollarGeneral, userId.toString(), card, threeMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromEndDate(apple, userId.toString(), card, lastMonthEndDate);
    addTransactionsWithCompanyForUserFromEndDate(apple, userId.toString(), card, twoMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromEndDate(apple, userId.toString(), card, threeMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromEndDate(betterWorldBooks, userId.toString(), card, lastMonthEndDate);
    addTransactionsWithCompanyForUserFromEndDate(betterWorldBooks, userId.toString(), card, twoMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromEndDate(betterWorldBooks, userId.toString(), card, threeMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromEndDate(coffee, userId.toString(), card, lastMonthEndDate);
    addTransactionsWithCompanyForUserFromEndDate(coffee, userId.toString(), card, twoMonthsAgoStartDate);
    addTransactionsWithCompanyForUserFromEndDate(coffee, userId.toString(), card, threeMonthsAgoStartDate);

    /* await mockIncomingPlaidTransactions(transactions); */
    console.log("successfully created george's transactions...");
  } catch (err) {
    console.error(err);
  }
};

export const createChicosTransactions = async (userId: Types.ObjectId, card: ICardDocument): Promise<void> => {
  try {
    // chico shopped a lot at walmart and amazon last month
    const lastMonthStartDate = dayjs().subtract(1, 'month').startOf('month').toDate();
    const lastMonthEndDate = dayjs().subtract(1, 'month').endOf('month').toDate();

    const walmart = await getCompanyByName('Walmart');
    const amazon = await getCompanyByName('Amazon');

    if (!walmart) {
      throw new Error('Walmart company not found');
    }
    if (!amazon) {
      throw new Error('Amazon company not found');
    }

    // add 10 transactions with walmart at the beginning of last month
    // and 10 transactions with amazon at the end of last month
    addTransactionsWithCompanyForUserFromStartDate(walmart, userId.toString(), card, lastMonthStartDate);
    addTransactionsWithCompanyForUserFromEndDate(amazon, userId.toString(), card, lastMonthEndDate);

    console.log("successfully created chico's transactions...");
  } catch (err) {
    console.error(err);
  }
};

const triggerMonthlyImpactReport = (userId: Types.ObjectId): void => {
  MainBullClient.createJob(
    JobNames.UserMonthlyImpactReport,
    { generateFullHistory: true, uid: userId },
    { jobId: `${JobNames.UserMonthlyImpactReport}-generate-report-for-user-${userId}` },
  );
};

export const createTestIdentities = async (): Promise<TestUserDocuments> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot create test identities in non-test environment');
  }
  try {
    // add cards to users
    const [henry, rachel, george, chico] = await createTestUsers();
    if (!henry || !rachel || !george || !chico) {
      throw new Error('Error creating test users');
    }
    console.log('successfully created users...');

    const { henrysCard, georgesCard, chicosCard } = await createTestCards({
      henry,
      george,
      chico,
    });
    console.log('successfully created cards...');

    console.log('adding users to kard...');

    // create transactions for each user with a card
    await createHenrysTransactions(henry._id, henrysCard);
    await createGeorgesTransactions(george._id, georgesCard);
    await createChicosTransactions(chico._id, chicosCard);

    // trigger monthly impact reports for each user
    console.log('triggering monthly impact reports...');
    triggerMonthlyImpactReport(henry._id);
    triggerMonthlyImpactReport(george._id);
    triggerMonthlyImpactReport(chico._id);

    console.log('saving updated documents...');
    const updatedUsers = await saveDocuments([henry, george, chico]);
    if (!updatedUsers) {
      throw new Error('Error saving updated users');
    }

    const testIdentities = {
      henry: (updatedUsers as IUserDocument[])?.find((user) => user._id.toString() === henry._id.toString()),
      george: (updatedUsers as IUserDocument[])?.find((user) => user._id.toString() === george._id.toString()),
      chico: (updatedUsers as IUserDocument[])?.find((user) => user._id.toString() === chico._id.toString()),
      rachel,
    };

    return testIdentities;
  } catch (err) {
    console.error(`Error creating test identity data: ${err}`);
    return null;
  }
};

export const triggerResetTestIdentities = (): void => {
  console.log('triggering reset test identities');
  MainBullClient.createJob(
    JobNames.ResetTestIdentities,
    { jobId: `${JobNames.ResetTestIdentities}` },
    {},
    {
      onComplete: () => {
        console.log(`${JobNames.ResetTestIdentities} finished`);
        console.log(`Triggering ${JobNames.GenerateUserImpactTotals}`);
        MainBullClient.createJob(
          JobNames.GenerateUserImpactTotals,
          {},
          { jobId: `${JobNames.GenerateUserImpactTotals}` },
        );
      },
    },
  );
};
