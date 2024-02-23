import { FilterQuery } from 'mongoose';
import { sectorsToExcludeFromTransactions } from '../../../lib/constants/transaction';
import { ITransaction, ITransactionDocument, TransactionModel } from '../../../models/transaction';

const plaidIntegrationPath = 'integrations.plaid.category';
const taxRefundExclusion = { [plaidIntegrationPath]: { $not: { $all: ['Tax', 'Refund'] } } };
const paymentExclusion = { [plaidIntegrationPath]: { $nin: ['Payment'] } };
const excludePaymentQuery = { ...taxRefundExclusion, ...paymentExclusion };

export const _getTransactions = async (query: FilterQuery<ITransactionDocument>, sortBySortableDate?: boolean) => (
  TransactionModel.aggregate([
    {
      $match: {
        $and: [
          { sector: { $nin: sectorsToExcludeFromTransactions } },
          { amount: { $gt: 0 } },
          { ...query },
        ],
      },
    },
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
      $sort: sortBySortableDate ? { sortableDate: -1 } : { date: -1 },
    },
  ])
);

export const getTransactionTotal = async (query: FilterQuery<ITransaction>): Promise<number> => {
  const aggResult = await TransactionModel.aggregate()
    .match({ sector: { $nin: sectorsToExcludeFromTransactions }, amount: { $gt: 0 }, ...query, ...excludePaymentQuery })
    .group({ _id: '$user', total: { $sum: '$amount' } });

  return aggResult?.length ? aggResult[0].total : 0;
};

// await needed her for TS to resolve the type of aggregations output
// eslint-disable-next-line no-return-await
export const getTransactionCount = async (query = {}) => await TransactionModel.find({
  sector: { $nin: sectorsToExcludeFromTransactions },
  amount: { $gt: 0 },
  ...query,
  ...excludePaymentQuery,
}).count();
