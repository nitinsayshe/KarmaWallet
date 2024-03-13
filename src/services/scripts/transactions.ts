import { TransactionModel } from '../../models/transaction';

export const addSortableDateToTransactions = async () => {
  try {
    let count = 0;
    const transactions = await TransactionModel
      .find({
        'integrations.plaid': { $exists: true },
        sortableDate: { $exists: false },
      })
      .limit(100000);

    console.log(`Found ${transactions.length} transactions`);
    for (const transaction of transactions) {
      transaction.sortableDate = transaction.date;
      transaction.settledDate = transaction.date;
      await transaction.save();
      count++;
      console.log(`Updating ${count} of ${transactions.length} transactions`);
    }
  } catch (err) {
    console.error('Error updating transactions', err);
  }
};
