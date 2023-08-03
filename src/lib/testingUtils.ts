import dayjs from 'dayjs';
import { ObjectId, Types } from 'mongoose';
import { ArticleModel, ArticleTypes, IArticleDocument } from '../models/article';
import { CardModel, ICardDocument } from '../models/card';
import { CompanyHideReasons, CompanyModel, ICompanyDocument } from '../models/company';
import { IMerchantDocument, MerchantModel } from '../models/merchant';
import { IMerchantRateDocument, MerchantRateModel } from '../models/merchantRate';
import { IPromoDocument, IPromoTypes, PromoModel } from '../models/promo';
import { ITransactionDocument, ITransactionIntegrations, TransactionModel } from '../models/transaction';
import { IUserDocument, UserEmailStatus, UserModel } from '../models/user';
import { getMonthStartDate } from '../services/impact/utils';
import { CardStatus } from './constants';
import { CompanyRating } from './constants/company';
import { getUtcDate } from './date';
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

export type CreateTestMerchantsRequest = {
  merchants?: Partial<IMerchantDocument>[];
};

export type CreateTestMerchantRatesRequest = {
  merchantRates?: Partial<IMerchantRateDocument>[];
};

export type CreateTestArticlesRequest = {
  articles?: Partial<IArticleDocument>[];
};

export type CreateTestCompaniesRequest = {
  companies?: Partial<ICompanyDocument>[];
};

export type CreateTestTransactionsRequest = {
  transactions?: Partial<ITransactionDocument>[];
};

export interface IRemoveableDocument {
  remove: () => Promise<this>;
}

export const cleanUpDocument = async (document: IRemoveableDocument) => {
  try {
    if (!document?.remove) throw new Error('Document does not have a remove method');
    await document.remove();
  } catch (err) {
    console.error(err);
  }
};

export const cleanUpDocuments = async (document: IRemoveableDocument[]) => {
  await Promise.all(
    document.map(async (d) => {
      await cleanUpDocument(d);
    }),
  );
};

export const createSomeUsers = async (req: CreateTestUsersRequest): Promise<IUserDocument[]> => (await Promise.all(
  req.users.map(async (user) => {
    const newUser = new UserModel();
    newUser.password = user?.password || 'password';
    newUser.name = user?.name || `Test User_${new Types.ObjectId().toString()}`;
    newUser.emails = user?.emails || [];
    newUser.articles = user?.articles || undefined;
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

export const createSomeMerchants = async (req: CreateTestMerchantsRequest): Promise<IMerchantDocument[]> => (await Promise.all(
  req.merchants.map(async (merchant) => {
    const newMerchant = new MerchantModel();
    newMerchant.name = merchant?.name || `Test Merchant_${new Types.ObjectId().toString()}`;
    newMerchant.integrations = merchant.integrations;
    return newMerchant.save();
  }),
)) || [];

export const createSomeMerchantRates = async (req: CreateTestMerchantRatesRequest): Promise<IMerchantRateDocument[]> => (await Promise.all(
  req.merchantRates.map(async (mr) => {
    const newMerchantRate = new MerchantRateModel();
    newMerchantRate.merchant = mr?.merchant || undefined;
    newMerchantRate.createdOn = mr?.createdOn || getUtcDate().toDate();
    newMerchantRate.lastModified = mr?.lastModified || getUtcDate().toDate();
    newMerchantRate.integrations = mr.integrations;
    return newMerchantRate.save();
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
    newPromo.headerText = promo?.headerText || `Test PROMO_HEADER_TEXT_${new Types.ObjectId().toString()}`;
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
    newCard.institution = card?.institution || 'Test Institution';
    newCard.name = card?.name || `Test Card_${new Types.ObjectId().toString()}`;
    newCard.integrations = card?.integrations || undefined;
    newCard.type = card?.type || undefined;
    newCard.binToken = card?.binToken || undefined;
    newCard.lastFourDigitsToken = card?.lastFourDigitsToken || undefined;
    return newCard.save();
  }),
)) || [];

export const createSomeArticles = async (req: CreateTestArticlesRequest): Promise<IArticleDocument[]> => (await Promise.all(
  req.articles.map(async (article) => {
    const newArticle = new ArticleModel();
    newArticle.company = article?.company || undefined;
    newArticle.createdOn = article?.createdOn || dayjs().utc().toDate();
    newArticle.lastModified = article?.lastModified || dayjs().utc().toDate();
    newArticle.enabled = article?.enabled || true;
    newArticle.type = article?.type || ArticleTypes.IndustryReport;
    newArticle.title = article?.title || undefined;
    newArticle.featured = article?.featured || undefined;
    newArticle.description = article?.description || `Test Article${new Types.ObjectId().toString()}`;
    newArticle.introParagraph = article?.introParagraph || 'paragraph';
    newArticle.title = article?.title || 'title';
    newArticle.body = article?.body || 'body';
    return newArticle.save();
  }),
)) || [];

export const createSomeCompanies = async (req: CreateTestCompaniesRequest): Promise<ICompanyDocument[]> => (await Promise.all(
  req.companies.map(async (company) => {
    const newCompany = new CompanyModel();
    newCompany.companyName = company?.companyName || 'Test Company{new Types.ObjectId().toString()}';
    newCompany.combinedScore = company?.combinedScore || undefined;
    newCompany.grade = company?.grade || undefined;
    newCompany.merchant = company?.merchant || undefined;
    newCompany.parentCompany = company?.parentCompany || undefined;
    newCompany.createdAt = company?.createdAt || dayjs().utc().toDate();
    newCompany.evaluatedUnsdgs = company?.evaluatedUnsdgs || [];
    newCompany.hidden = company?.hidden || {
      status: false,
      reason: CompanyHideReasons.None,
      lastModified: new Date(),
    };
    newCompany.rating = company?.rating || CompanyRating.Neutral;
    newCompany.sectors = company?.sectors || [];
    return newCompany.save();
  }),
)) || [];

export const createATestCompany = async (): Promise<ICompanyDocument> => {
  const company = new CompanyModel();
  company.companyName = `Test Company_${new Types.ObjectId().toString}`;
  company.combinedScore = getRandomInt(-16, 16);
  company.createdAt = dayjs().subtract(1, 'week').toDate();
  company.hidden = {
    status: false,
    reason: CompanyHideReasons.None,
    lastModified: new Date(),
  };
  company.hidden = { status: false, reason: CompanyHideReasons.None, lastModified: new Date() };
  return company.save();
};

export const createSomeTransactions = async (req: CreateTestTransactionsRequest): Promise<ITransactionDocument[]> => (await Promise.all(
  req.transactions.map(async (t) => {
    const newTransaction = new TransactionModel();
    newTransaction.date = t.date || dayjs().subtract(1, 'week').toDate();
    newTransaction.user = t.userId;
    newTransaction.company = t.company;
    newTransaction.amount = t.amount || getRandomInt(1, 100);
    newTransaction.card = t.card;
    newTransaction.integrations = t.integrations;
    if (!!t.integrations) {
      newTransaction.integrations = {};
    }
    newTransaction.integrations.plaid = t.integrations?.plaid;
    newTransaction.integrations.kard = t.integrations?.kard;

    return newTransaction.save();
  }),
)) || [];

export const createSomeTransactionsWithCompany = async (
  count: number,
  userId: ObjectId,
  company: ICompanyDocument,
  date?: Date,
  card?: ICardDocument,
  integrations?: ITransactionIntegrations,
): Promise<ITransactionDocument[]> => {
  const transactions: ITransactionDocument[] = [];
  for (let i = 0; i < count; i++) {
    const transaction = new TransactionModel();
    transaction.date = date || dayjs().subtract(1, 'week').toDate();
    transaction.user = userId;
    transaction.company = company;
    transaction.amount = getRandomInt(1, 100);
    transaction.card = card;
    transaction.integrations = integrations;
    const updatedTransaction = await transaction.save();
    transactions.push(updatedTransaction);
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
