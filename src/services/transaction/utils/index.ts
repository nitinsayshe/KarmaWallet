import { FilterQuery } from 'mongoose';
import { roundToPercision } from '../../../lib/misc';
import { AutomatedFuelDispensersMccCode, FastFoodMccCode, RestaurantMccCode } from '../../../lib/constants';
import { sectorsToExcludeFromTransactions } from '../../../lib/constants/transaction';
import { ITransaction, ITransactionDocument, TransactionModel } from '../../../models/transaction';
import { MerchantRateModel } from '../../../models/merchantRate';
import { CompanyModel } from '../../../models/company';

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
export const getSpendingTotals = async (startDate: Date, endDate: Date): Promise<{ cashbackMerchantTotal: number, gasTotal: number; mealsTotal: number, total: number }> => {
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

  const total = (await TransactionModel.aggregate()
    .match({
      'integrations.marqeta': { $exists: true },
      amount: { $gt: 0 },
      date: { $gte: startDate, $lte: endDate },
    })
    .group({ _id: '$_id', amount: { $first: '$amount' } })
    .group({ _id: null, total: { $sum: '$amount' } })) as unknown as { _id: null; total: number }[];

  const cashbackMerchantTransactions = await TransactionModel.find({
    'integrations.marqeta': { $exists: true },
    amount: { $gt: 0 },
    date: { $gte: startDate, $lte: endDate },
  });

  // filter out any that were with a company that doens't have a merchant
  const cashbackMerchantTotal = (await Promise.all(cashbackMerchantTransactions.map(async (transaction) => {
    const company = await CompanyModel.findById(transaction.company);
    if (!company) {
      return null;
    }
    const merchant = await MerchantRateModel.findOne({ merchant: company.merchant });
    if (!merchant) {
      return null;
    }

    const rates = await MerchantRateModel.find({ merchant: company.merchant });
    if (!rates?.length) {
      return null;
    }
    return transaction.amount;
  }))).filter((transaction) => transaction !== null).reduce((acc, val) => acc + val, 0);

  return { cashbackMerchantTotal: roundToPercision(cashbackMerchantTotal, 2), total: roundToPercision(total?.[0]?.total, 2), gasTotal: roundToPercision(gasTotal?.[0]?.total, 2), mealsTotal: roundToPercision(mealsTotal?.[0]?.total, 2) };
};
