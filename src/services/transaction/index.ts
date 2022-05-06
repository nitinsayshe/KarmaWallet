import { FilterQuery, ObjectId } from 'mongoose';
import { AqpQuery } from 'api-query-params';
import {
  IShareableTransaction,
  ITransaction,
  ITransactionDocument,
  TransactionModel,
} from '../../models/transaction';
import { ErrorTypes, RareTransactionQuery, UserRoles } from '../../lib/constants';
import { IRequest } from '../../types/request';
import { RareClient } from '../../clients/rare';
import { getShareableSector } from '../sectors';
import { ISector, ISectorDocument, SectorModel } from '../../models/sector';
import { IRef } from '../../types/model';
import CustomError, { asCustomError } from '../../lib/customError';
import { CompanyModel, ICompanyDocument, IShareableCompany } from '../../models/company';
import { getShareableCompany } from '../company';
import { getShareableUser } from '../user';
import { IShareableUser, IUserDocument, UserModel } from '../../models/user';
import { CardModel, ICardDocument, IShareableCard } from '../../models/card';
import { getShareableCard } from '../card';
import { GroupModel } from '../../models/group';
import { _getTransactions } from './utils';

const plaidIntegrationPath = 'integrations.plaid.category';
const taxRefundExclusion = { [plaidIntegrationPath]: { $not: { $all: ['Tax', 'Refund'] } } };
const paymentExclusion = { [plaidIntegrationPath]: { $nin: ['Payment'] } };
const excludePaymentQuery = { ...taxRefundExclusion, ...paymentExclusion };

export enum ITransactionsConfig {
  MostRecent = 'recent',
}

export interface IGetRecentTransactionsRequestQuery {
  limit?: number;
  unique?: boolean;
  userId?: string | ObjectId;
}

export interface ITransactionsRequestQuery extends AqpQuery {
  userId?: string;
  includeOffsets?: boolean;
  includeNullCompanies?: boolean;
}

export interface ITransactionOptions {
  includeOffsets?: boolean;
  includeNullCompanies?: boolean;
}

export const getTransactions = (req: IRequest<{}, ITransactionsRequestQuery>, query: FilterQuery<ITransaction>) => {
  const { userId, includeOffsets, includeNullCompanies } = req.query;

  if (!req.requestor) throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);

  const paginationOptions = {
    projection: query?.projection || '',
    populate: query.population || [
      {
        path: 'user',
        model: UserModel,
      },
      {
        path: 'company',
        model: CompanyModel,
      },
      {
        path: 'card',
        model: CardModel,
      },
      {
        path: 'sector',
        model: SectorModel,
      },
      {
        path: 'association.user',
        model: UserModel,
      },
      {
        path: 'association.group',
        model: GroupModel,
      },
    ],
    page: query?.skip || 1,
    sort: query?.sort ? { ...query.sort, _id: -1 } : { date: -1, _id: -1 },
    limit: query?.limit || 10,
  };
  const filter: FilterQuery<ITransaction> = { ...query.filter };

  delete filter.userId;
  delete filter.includeOffsets;
  delete filter.includeNullCompanies;

  if (!!userId) {
    if (req.requestor._id.toString() !== userId && req.requestor.role === UserRoles.None) {
      throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);
    }

    filter.$or = [
      { user: userId },
      { 'onBehalfOf.user': userId },
    ];
  } else {
    filter.$or = [
      { user: req.requestor },
      { 'onBehalfOf.user': req.requestor },
    ];
  }

  if (!includeOffsets) filter['integrations.rare'] = null;
  if (!includeNullCompanies) filter.company = { $ne: null };

  console.log('>>>>> filter', filter.$or);

  return TransactionModel.paginate(filter, paginationOptions);
};

export const getMostRecentTransactions = async (req: IRequest<{}, IGetRecentTransactionsRequestQuery>) => {
  try {
    const { limit = 5, unique = true, userId } = req.query;
    const _limit = parseInt(limit.toString());
    if (isNaN(_limit)) throw new CustomError('Invalid limit found. Must be a number.');

    const query: FilterQuery<ITransactionDocument> = {};

    if (!!userId) {
      if (req.requestor._id.toString() !== userId && req.requestor.role === UserRoles.None) {
        throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);
      }

      query.$or = [
        { user: userId },
        { 'onBehalfOf.user': userId },
      ];
    } else {
      query.$or = [
        { user: req.requestor._id },
        { 'onBehalfOf.user': req.requestor._id },
      ];
    }

    query['integrations.rare'] = null;
    query.company = { $ne: null };

    const transactions = await _getTransactions(query);

    const uniqueCompanies = new Set();
    const recentTransactions: ITransactionDocument[] = [];

    for (const transaction of transactions) {
      if (unique && uniqueCompanies.has((transaction.company as ICompanyDocument)?._id.toString())) continue;

      recentTransactions.push(transaction);
      uniqueCompanies.add((transaction.company as ICompanyDocument)?._id.toString());

      if (recentTransactions.length === _limit) break;
    }

    return recentTransactions;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getTransactionTotal = async (query: FilterQuery<ITransaction>): Promise<number> => {
  const aggResult = await TransactionModel.aggregate()
    .match({ ...query, ...excludePaymentQuery })
    .group({ _id: '$user', total: { $sum: '$amount' } });

  return aggResult?.length ? aggResult[0].total : 0;
};

// await needed her for TS to resolve the type of aggregations output
// eslint-disable-next-line no-return-await
export const getTransactionCount = async (query = {}) => await TransactionModel.find({ ...query, ...excludePaymentQuery }).count();

export const getCarbonOffsetTransactions = async (req: IRequest) => {
  const Rare = new RareClient();
  const transactions: ITransactionDocument[] = await TransactionModel.find({
    $or: [
      { userId: req?.requestor?._id },
      { 'onBehalfOf.user': req?.requestor?._id },
    ],
    matchType: null,
    ...RareTransactionQuery,
  });

  if (transactions.length === 0) return [];

  const rareTransactions = await Rare.getTransactions(req.requestor?.integrations?.rare?.userId);

  return transactions.map((transaction) => {
    const matchedRareTransaction = rareTransactions.transactions.find(rareTransaction => transaction.integrations.rare.transaction_id === rareTransaction.transaction_id);
    transaction.integrations.rare.certificateUrl = matchedRareTransaction?.certificate_url;
    return transaction;
  });
};

export const getShareableTransaction = ({
  user,
  company,
  card,
  sector,
  amount,
  date,
  createdOn,
  lastModified,
  integrations,
}: ITransactionDocument) => {
  const _user: IRef<ObjectId, IShareableUser> = !!(user as IUserDocument)?.name
    ? getShareableUser(user as IUserDocument)
    : user;

  const _card: IRef<ObjectId, IShareableCard> = !!(card as ICardDocument)?.mask
    ? getShareableCard(card as ICardDocument)
    : card;

  const _company: IRef<ObjectId, IShareableCompany> = !!(company as ICompanyDocument)?.companyName
    ? getShareableCompany(company as ICompanyDocument)
    : company;

  const _sector: IRef<ObjectId, ISector> = !!(sector as ISectorDocument)?.name
    ? getShareableSector(sector as ISectorDocument)
    : sector;

  const shareableTransaction: Partial<IShareableTransaction> = {
    user: _user,
    company: _company,
    card: _card,
    sector: _sector,
    amount,
    date,
    createdOn,
    lastModified,
  };

  if (integrations?.rare) {
    const {
      projectName,
      tonnes_amt: offsetsPurchased,
      certificateUrl,
    } = integrations.rare;

    const rareIntegration = {
      projectName,
      offsetsPurchased,
      certificateUrl,
    };

    shareableTransaction.integrations = {
      ...shareableTransaction.integrations,
      rare: rareIntegration,
    };
  }

  return shareableTransaction;
};

export const hasTransactions = async (req: IRequest<{}, ITransactionsRequestQuery>) => {
  try {
    const { userId, includeOffsets, includeNullCompanies } = req.query;
    const _userId = userId ?? req.requestor._id;

    const query: FilterQuery<ITransaction> = {
      $and: [
        {
          $or: [
            { user: _userId },
            { 'onBehalfOf.user': _userId },
          ],
        },
      ],
    };

    if (!includeOffsets) query.$and.push({ 'integrations.rare': null });
    if (!includeNullCompanies) query.$and.push({ company: { $ne: null } });

    const count = await getTransactionCount(query);

    return count > 0;
  } catch (err) {
    throw asCustomError(err);
  }
};
