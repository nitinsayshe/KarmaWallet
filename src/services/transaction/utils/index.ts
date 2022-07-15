import { FilterQuery } from 'mongoose';
import { sectorsToExcludeFromTransactions } from '../../../lib/constants/transaction';
import { ITransactionDocument, TransactionModel } from '../../../models/transaction';

export const _getTransactions = async (query: FilterQuery<ITransactionDocument>) => TransactionModel.aggregate([
  { $match: {
    $and: [
      { sector: { $nin: sectorsToExcludeFromTransactions } },
      { amount: { $gt: 0 } },
      { ...query },
    ],
  } },
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
