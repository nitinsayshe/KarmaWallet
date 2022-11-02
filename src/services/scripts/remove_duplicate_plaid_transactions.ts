import { TransactionModel } from '../../models/transaction';

export const removeDuplicatePlaidTransactions = async () => {
  let duplicateCount = 0;
  const duplicates = await TransactionModel.aggregate([
    {
      $match: {
        'integrations.plaid.transaction_id': {
          $ne: null,
        },
      },
    }, {
      $group: {
        _id: '$integrations.plaid.transaction_id',
        count: {
          $sum: 1,
        },
      },
    }, {
      $match: {
        count: {
          $gt: 1,
        },
      },
    },
  ]);
  console.log(`Found ${duplicates.length} duplicate plaid transactions`);
  for (const transaction of duplicates) {
    const duplicateTransactions = await TransactionModel.find({
      'integrations.plaid.transaction_id': transaction._id,
    });
    if (duplicateTransactions?.length > 1) {
      const idsToDelete = duplicateTransactions.slice(1).map(t => t._id);
      await TransactionModel.deleteMany({ _id: { $in: duplicateTransactions.slice(1).map(t => t._id) } });
      duplicateCount += idsToDelete.length;
      console.log(`Deleting ${idsToDelete.length} duplicate transactions`);
    }
  }
  console.log(`[#] deleted ${duplicateCount} duplicate transactions`);
};
