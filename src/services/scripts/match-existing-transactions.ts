import { ObjectId } from 'mongoose';
import { Transaction as IPlaidTransaction } from 'plaid';
import { PlaidMapper } from '../../integrations/plaid/mapper';
import { TransactionModel } from '../../models/transaction';
import Transaction from '../../integrations/plaid/transaction';

export const singleBatchMatch = async (batchNumber: number, batchSize: number) => {
  const skip = batchNumber * batchSize;
  console.log(`matching transactions up ${skip} count`);
  const transactionsInBatch = await TransactionModel.find({ 'integrations.plaid': { $ne: null } }).skip(skip).limit(batchSize).lean();
  const transactions = transactionsInBatch.map((t) => {
    const plaidTransaction = { amount: t.amount, ...t.integrations.plaid };
    return new Transaction(
      t.user as ObjectId,
      t.card as ObjectId,
      plaidTransaction as any as IPlaidTransaction,
      t._id,
    );
  });
  const mapper = new PlaidMapper([], transactions);
  await mapper.init();
  await mapper.mapSectorsToTransactions();
  await mapper.mapTransactionsToCompanies();
  await mapper.saveTransactions();
  await mapper.saveSummary();
};

const matchExistingTransactions = async ({
  startingIndex = 0,
  endingIndex = null,
  batchSize = 50000,
}) => {
  const transactionCount = await TransactionModel.countDocuments({ 'integrations.plaid': { $ne: null } });
  const batchCount = Math.ceil(transactionCount / batchSize);
  const endingBatch = endingIndex || batchCount;
  for (let i = startingIndex; i < endingBatch; i += 1) {
    const transactionsInBatch = await TransactionModel.find({ 'integrations.plaid': { $ne: null } }, null, { skipSessions: true }).skip(i * batchSize).limit(batchSize).lean();
    const transactions = transactionsInBatch.map((t) => {
      const plaidTransaction = { amount: t.amount, ...t.integrations.plaid };
      return new Transaction(
        t.user as ObjectId,
        t.card as ObjectId,
        plaidTransaction as any as IPlaidTransaction,
        t._id,
      );
    });
    const mapper = new PlaidMapper([], transactions);
    await mapper.init();
    await mapper.mapSectorsToTransactions();
    await mapper.mapTransactionsToCompanies();
    await mapper.saveTransactions();
    await mapper.saveSummary();
  }
};

// exporting as default to spawn a new process
export default matchExistingTransactions;
