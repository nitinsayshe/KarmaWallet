import { ObjectId } from 'mongoose';
import { Transaction as IPlaidTransaction } from 'plaid';
import { PlaidMapper } from '../../integrations/plaid/mapper';
import { TransactionModel } from '../../models/transaction';
import Transaction from '../../integrations/plaid/transaction';

const matchExistingTransactions = async () => {
  const transactionCount = await TransactionModel.countDocuments({ 'integrations.plaid': { $ne: null } });
  const batchSize = 50000;
  const batchCount = Math.ceil(transactionCount / batchSize);
  for (let i = 0; i < batchCount; i += 1) {
    const transactionsInBatch = await TransactionModel.find({ 'integrations.plaid': { $ne: null } }).skip(i * batchSize).limit(batchSize).lean();
    const transactions = transactionsInBatch.map((t) => {
      const plaidTransaction = { amount: t.amount, ...t.integrations.plaid };
      return new Transaction(t.user as ObjectId, t.card as ObjectId, plaidTransaction as any as IPlaidTransaction);
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
