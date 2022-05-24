import { FilterQuery, ObjectId, Types } from 'mongoose';
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
import { CompanyRating } from '../../lib/constants/company';
import { getCompanyRatingsThresholds } from '../misc';

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

export const _deleteTransactions = async (query: FilterQuery<ITransactionDocument>) => TransactionModel.deleteMany(query);
export interface ITransactionsRequestQuery extends AqpQuery {
  userId?: string;
  includeOffsets?: boolean;
  includeNullCompanies?: boolean;
  onlyOffsets?: boolean;
}

export interface ITransactionsAggregationRequestQuery {
  userId?: string;
  ratings?: CompanyRating[];
  page?: number;
  limit?: number;
}

export interface ITransactionOptions {
  includeOffsets?: boolean;
  includeNullCompanies?: boolean;
}

export const getRatedTransactions = async (req: IRequest<{}, ITransactionsAggregationRequestQuery>) => {
  try {
    const { ratings, userId, page, limit } = req.query;

    if (!req.requestor) throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);

    if (!ratings || !ratings.length) throw new CustomError('A company rating is required to get rated transactions.', ErrorTypes.INVALID_ARG);

    const _ratings = Array.isArray(ratings) ? ratings : [...(ratings as string).split(',')];

    const invalidRatings = _ratings.filter(rating => !Object.values(CompanyRating).find(r => r === rating));
    if (invalidRatings.length) throw new CustomError('One or more of the ratings found are invalid.', ErrorTypes.INVALID_ARG);

    const userQuery: FilterQuery<ITransaction> = {
      $and: [
        { company: { $ne: null } },
      ],
    };

    if (!!userId) {
      if (req.requestor._id.toString() !== userId && req.requestor.role === UserRoles.None) {
        throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);
      }

      const _userId = new Types.ObjectId(userId);

      userQuery.$and.push({
        $or: [
          { user: _userId },
          { 'onBehalfOf.user': _userId },
        ],
      });
    } else {
      userQuery.$and.push({
        $or: [
          { user: req.requestor._id },
          { 'onBehalfOf.user': req.requestor._id },
        ],
      });
    }

    const companyRatingThresholds = await getCompanyRatingsThresholds();

    const companyQuery: FilterQuery<ITransaction> = {
      $or: _ratings.map(rating => {
        if (rating === CompanyRating.Positive) {
          return { 'company.combinedScore': { $gte: companyRatingThresholds[CompanyRating.Positive].min } };
        }

        if (rating === CompanyRating.Negative) {
          return { 'company.combinedScore': { $lte: companyRatingThresholds[CompanyRating.Negative].max } };
        }

        return {
          $and: [
            { 'company.combinedScore': { $gte: companyRatingThresholds[CompanyRating.Neutral].min } },
            { 'company.combinedScore': { $lte: companyRatingThresholds[CompanyRating.Neutral].max } },
          ],
        };
      }),
    };

    const transactionAggregate = TransactionModel.aggregate([
      {
        $match: userQuery,
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'company',
          foreignField: '_id',
          as: 'company',
        },
      },
      {
        $unwind: {
          path: '$company',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: companyQuery,
      },
    ]);

    const options = {
      page: page ?? 1,
      limit: limit ?? 10,
    };

    const transactions = await TransactionModel.aggregatePaginate(transactionAggregate, options);

    const pageIncludesOffsets = transactions.docs.filter(transaction => !!transaction.integrations?.rare).length;

    if (!!pageIncludesOffsets) {
      try {
        const Rare = new RareClient();
        const rareTransactions = await Rare.getTransactions(req.requestor?.integrations?.rare?.userId);

        transactions.docs.forEach(transaction => {
          const matchedRareTransaction = rareTransactions.transactions.find(rareTransaction => transaction.integrations.rare.transaction_id === rareTransaction.transaction_id);
          transaction.integrations.rare.certificateUrl = matchedRareTransaction?.certificate_url;
        });
      } catch (err) {
        console.log('[-] Failed to retrieve Rare transactions');
        console.log(err);
      }
    }

    return transactions;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getTransactions = async (req: IRequest<{}, ITransactionsRequestQuery>, query: FilterQuery<ITransaction>) => {
  const { userId, includeOffsets, includeNullCompanies, onlyOffsets } = req.query;

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
  const filter: FilterQuery<ITransaction> = {
    $and: Object.entries(query.filter)
      .filter(([key]) => (key !== 'userId' && key !== 'includeOffsets' && key !== 'includeNullCompanies' && key !== 'onlyOffsets'))
      .map(([key, value]) => ({ [key]: value })),
  };

  if (!!userId) {
    if (req.requestor._id.toString() !== userId && req.requestor.role === UserRoles.None) {
      throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);
    }

    filter.$and.push({
      $or: [
        { user: userId },
        { 'onBehalfOf.user': userId },
      ],
    });
  } else {
    filter.$and.push({
      $or: [
        { user: req.requestor },
        { 'onBehalfOf.user': req.requestor },
      ],
    });
  }

  if (!!onlyOffsets) filter.$and.push({ 'integrations.rare': { $ne: null } });
  if (!includeOffsets && !onlyOffsets) filter.$and.push({ 'integrations.rare': null });
  if (!includeNullCompanies) filter.$and.push({ company: { $ne: null } });

  const transactions = await TransactionModel.paginate(filter, paginationOptions);

  if (includeOffsets || onlyOffsets) {
    const pageIncludesOffsets = transactions.docs.filter(transaction => !!transaction.integrations?.rare).length;

    if (!!pageIncludesOffsets) {
      try {
        const Rare = new RareClient();
        const rareTransactions = await Rare.getTransactions(req.requestor?.integrations?.rare?.userId);

        transactions.docs.forEach(transaction => {
          const matchedRareTransaction = rareTransactions.transactions.find(rareTransaction => transaction.integrations.rare.transaction_id === rareTransaction.transaction_id);
          transaction.integrations.rare.certificateUrl = matchedRareTransaction?.certificate_url;
        });
      } catch (err) {
        console.log('[-] Failed to retrieve Rare transactions');
        console.log(err);
      }
    }
  }

  return transactions;
};

export const getMostRecentTransactions = async (req: IRequest<{}, IGetRecentTransactionsRequestQuery>) => {
  try {
    const { limit = 5, unique = true, userId } = req.query;
    const _limit = parseInt(limit.toString());
    if (isNaN(_limit)) throw new CustomError('Invalid limit found. Must be a number.');

    const query: FilterQuery<ITransactionDocument> = { $and: [] };

    if (!!userId) {
      if (req.requestor._id.toString() !== userId && req.requestor.role === UserRoles.None) {
        throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);
      }

      query.$and.push({
        $or: [
          { user: userId },
          { 'onBehalfOf.user': userId },
        ],
      });
    } else {
      query.$and.push({
        $or: [
          { user: req.requestor._id },
          { 'onBehalfOf.user': req.requestor._id },
        ],
      });
    }

    query.$and.push({ 'integrations.rare': null });
    query.$and.push({ company: { $ne: null } });

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
  _id,
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

  const shareableTransaction: Partial<IShareableTransaction & { _id: string }> = {
    _id,
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
