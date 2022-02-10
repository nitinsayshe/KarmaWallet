import { AnyObject } from 'mongoose';
import {
  ITransactionIntegrations, ITransactionModel, TransactionModel,
} from '../../models/transaction';
import { RareTransactionQuery } from '../../lib/constants';
import { IRequest } from '../../types/request';

const plaidIntegrationPath = 'integrations.plaid.category';
const taxRefundExclusion = { [plaidIntegrationPath]: { $not: { $all: ['Tax', 'Refund'] } } };
const paymentExclusion = { [plaidIntegrationPath]: { $nin: ['Payment'] } };
const excludePaymentQuery = { ...taxRefundExclusion, ...paymentExclusion };

export const getTransactionTotal = async (query: AnyObject) => {
  const aggResult = await TransactionModel.aggregate()
    .match({ ...query, ...excludePaymentQuery })
    .group({ _id: '$userId', total: { $sum: '$amount' } });
  const sumTotal = aggResult?.length ? aggResult[0].total : 0;
  return sumTotal;
};

export const getTransactionCount = async (query = {}) => {
  const count = await TransactionModel.find({ ...query, ...excludePaymentQuery }).count();
  return count;
};

export const getCarbonOffsetTransactions = async (req: IRequest) => TransactionModel.find({ userId: req?.requestor?._id, ...RareTransactionQuery });

export const getShareableTransaction = (transaction: ITransactionModel) => {
  const {
    userId, companyId, cardId, category, subCategory, amount, date, createdOn, lastModified, integrations,
  } = transaction;

  const shareableTransaction: Partial<ITransactionModel> = {
    userId,
    companyId,
    cardId,
    category,
    subCategory,
    amount,
    date,
    createdOn,
    lastModified,
  };

  if (integrations?.rare) {
    const { projectName, offsetsPurchased } = integrations.rare;
    const rareIntegration: ITransactionIntegrations = {
      rare: {
        projectName,
        offsetsPurchased,
      },
    };
    shareableTransaction.integrations = rareIntegration;
  }
  return shareableTransaction;
};
