import { FilterQuery, ObjectId, Types } from 'mongoose';
import {
  IShareableTransaction,
  ITransaction,
  ITransactionDocument,
  TransactionModel,
} from '../../models/transaction';
import { RareTransactionQuery } from '../../lib/constants';
import { IRequest } from '../../types/request';
import { RareClient } from '../../clients/rare';
import { getShareableSector } from '../sectors';
import { ISector, ISectorDocument } from '../../models/sector';
import { IRef } from '../../types/model';
import { asCustomError } from '../../lib/customError';
import { ICompanyDocument, IShareableCompany } from '../../models/company';
import { getShareableCompany } from '../company';
import { getShareableUser } from '../user';
import { IShareableUser, IUserDocument } from '../../models/user';
import { ICardDocument, IShareableCard } from '../../models/card';
import { getShareableCard } from '../card';

const plaidIntegrationPath = 'integrations.plaid.category';
const taxRefundExclusion = { [plaidIntegrationPath]: { $not: { $all: ['Tax', 'Refund'] } } };
const paymentExclusion = { [plaidIntegrationPath]: { $nin: ['Payment'] } };
const excludePaymentQuery = { ...taxRefundExclusion, ...paymentExclusion };

export interface IGetRecentTransactionsRequestQuery {
  limit?: number;
  unique?: boolean;
  userId?: string | ObjectId;
}

export const _deleteTransactions = async (query: FilterQuery<ITransactionDocument>) => TransactionModel.deleteMany(query);

export const _getTransactions = async (query: FilterQuery<ITransactionDocument>) => TransactionModel.aggregate([
  { $match: query },
  {
    $lookup: {
      from: 'cards',
      localField: 'card',
      foreignField: '_id',
      as: 'card',
    },
  },
  {
    $unwind: {
      path: '$card',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: 'companies',
      localField: 'company',
      foreignField: '_id',
      as: 'company',
    },
  }, {
    $unwind: {
      path: '$company',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: 'sectors',
      localField: 'sector',
      foreignField: '_id',
      as: 'sector',
    },
  }, {
    $unwind: {
      path: '$sector',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $sort: {
      date: -1,
    },
  },
]);

export const getRecentTransactions = async (req: IRequest<{}, IGetRecentTransactionsRequestQuery>, transactions: ITransactionDocument[] = []) => {
  try {
    const { limit = 5, unique = true, userId } = req.query;

    let _transactions = [...transactions];
    if (!_transactions.length) {
      const query: FilterQuery<ITransactionDocument> = { company: { $ne: null } };
      if (!!userId) query.user = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

      _transactions = await _getTransactions(query);
    }

    const uniqueCompanies = new Set();
    const recentTransactions: ITransactionDocument[] = [];

    for (const transaction of _transactions) {
      if (unique && uniqueCompanies.has((transaction.company as ICompanyDocument)._id.toString())) {
        uniqueCompanies.add((transaction.company as ICompanyDocument)._id.toString());
        continue;
      }
      recentTransactions.push(transaction);

      if (recentTransactions.length === limit) break;
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
