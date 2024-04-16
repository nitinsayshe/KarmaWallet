import { FilterQuery } from 'mongoose';
import { roundToPercision } from '../../../lib/misc';
import { AutomatedFuelDispensersMccCode, FastFoodMccCode, RestaurantMccCode } from '../../../lib/constants';
import { sectorsToExcludeFromTransactions } from '../../../lib/constants/transaction';
import { ITransaction, ITransactionDocument, TransactionModel } from '../../../models/transaction';

const plaidIntegrationPath = 'integrations.plaid.category';
const taxRefundExclusion = { [plaidIntegrationPath]: { $not: { $all: ['Tax', 'Refund'] } } };
const paymentExclusion = { [plaidIntegrationPath]: { $nin: ['Payment'] } };
const excludePaymentQuery = { ...taxRefundExclusion, ...paymentExclusion };

export const _getTransactions = async (query: FilterQuery<ITransactionDocument>, sortBySortableDate?: boolean) => TransactionModel.aggregate([
  {
    $match: {
      $and: [{ sector: { $nin: sectorsToExcludeFromTransactions } }, { amount: { $gt: 0 } }, { ...query }],
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
  },
  {
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
  },
  {
    $unwind: {
      path: '$sector',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $sort: sortBySortableDate ? { sortableDate: -1 } : { date: -1 },
  },
]);

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

// calculate total spent on gas and meals between two dates
export const getGasAndMealSpendingTotals = async (startDate: Date, endDate: Date): Promise<{ gasTotal: number; mealsTotal: number }> => {
  const gasTotal = (await TransactionModel.aggregate()
    .match({
      amount: { $gt: 0 },
      date: { $gte: startDate, $lte: endDate },
      $or: [
        {
          $and: [
            { 'integrations.marqeta.card_acceptor.mcc': { $exists: true } },
            { 'integrations.marqeta.card_acceptor.mcc': AutomatedFuelDispensersMccCode },
          ],
        },
        {
          $and: [
            { 'integrations.marqeta.relatedTransactions.card_acceptor.mcc': { $exists: true } },
            { 'integrations.marqeta.relatedTransactions.card_acceptor.mcc': AutomatedFuelDispensersMccCode },
          ],
        },
      ],
    })
    .group({ _id: '$_id', amount: { $first: '$amount' } })
    .group({ _id: null, total: { $sum: '$amount' } })) as unknown as { _id: null; total: number }[];

  const mealsTotal = (await TransactionModel.aggregate()
    .match({
      amount: { $gt: 0 },
      date: { $gte: startDate, $lte: endDate },
      $or: [
        {
          $and: [
            { 'integrations.marqeta.card_acceptor.mcc': { $exists: true } },
            { 'integrations.marqeta.card_acceptor.mcc': { $in: [RestaurantMccCode, FastFoodMccCode] } },
          ],
        },
        {
          $and: [
            { 'integrations.marqeta.relatedTransactions.card_acceptor.mcc': { $exists: true } },
            { 'integrations.marqeta.relatedTransactions.card_acceptor.mcc': { $in: [RestaurantMccCode, FastFoodMccCode] } },
          ],
        },
      ],
    })
    .group({ _id: '$_id', amount: { $first: '$amount' } })
    .group({ _id: null, total: { $sum: '$amount' } })) as unknown as { _id: null; total: number }[];
  return { gasTotal: roundToPercision(gasTotal[0].total, 2), mealsTotal: roundToPercision(mealsTotal[0].total, 2) };
};
