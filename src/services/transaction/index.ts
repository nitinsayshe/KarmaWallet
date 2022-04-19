import { FilterQuery } from 'mongoose';
import {
  ITransaction,
  ITransactionDocument,
  TransactionModel,
} from '../../models/transaction';
import { RareTransactionQuery } from '../../lib/constants';
import { IRequest } from '../../types/request';
import { RareClient } from '../../clients/rare';

const plaidIntegrationPath = 'integrations.plaid.category';
const taxRefundExclusion = { [plaidIntegrationPath]: { $not: { $all: ['Tax', 'Refund'] } } };
const paymentExclusion = { [plaidIntegrationPath]: { $nin: ['Payment'] } };
const excludePaymentQuery = { ...taxRefundExclusion, ...paymentExclusion };

export const getTransactionTotal = async (query: FilterQuery<ITransaction>): Promise<number> => {
  const aggResult = await TransactionModel.aggregate()
    .match({ ...query, ...excludePaymentQuery })
    .group({ _id: '$userId', total: { $sum: '$amount' } });

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
}: ITransactionDocument) => {
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
