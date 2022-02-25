import { AnyObject } from 'mongoose';
import { ITransaction, ITransactionModel, TransactionModel } from '../../models/transaction';
import { RareTransactionQuery } from '../../lib/constants';
import { IRequest } from '../../types/request';
import { RareClient } from '../../integrations/rare/sdk';

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

export const getCarbonOffsetTransactions = async (req: IRequest) => {
  const Rare = new RareClient();
  const transactions = await TransactionModel.find({ userId: req?.requestor?._id, ...RareTransactionQuery });
  if (transactions.length === 0) return [];
  const rareTransactions = await Rare.getTransactions(req.requestor?.integrations?.rare?.userId);
  const transactionsWithCertificates = transactions.map((transaction) => {
    const matchedRareTransaction = rareTransactions.transactions.find(rareTransaction => transaction.integrations.rare.transaction_id === rareTransaction.transaction_id);
    const newTransaction = { ...transaction.toObject() };
    newTransaction.integrations.rare.certificateUrl = matchedRareTransaction?.certificate_url;
    return newTransaction;
  });
  return transactionsWithCertificates;
};

export const getShareableTransaction = (transaction: ITransactionModel) => {
  const {
    userId,
    companyId,
    cardId,
    category,
    subCategory,
    amount,
    date,
    createdOn,
    lastModified,
    integrations,
  } = transaction;

  const shareableTransaction: Partial<ITransaction> = {
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
