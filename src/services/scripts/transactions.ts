import { TransactionModel } from '../../models/transaction';

// export const updateTransactions = async () => {
//   try {
//     let count = 0;
//     const transactions = await TransactionModel.find({
//       'integrations.plaid': { $exists: true },
//       sortableDate: { $exists: false },
//     });
//   } catch (err) {
//     console.error('Error updating transactions', err);
//   }
// };

// write a function that finds all transactions without sortableDate field, then adds sortableDate field set to the value of the existing date field
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
