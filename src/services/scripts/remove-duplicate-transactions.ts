import { identifyAndRemoveDuplicateTransactions } from '../../integrations/plaid/v2_transaction';
import { TransactionModel } from '../../models/transaction';

export const removeDuplicatePlaidTransactions = async () => {
  const transactions = await TransactionModel.aggregate([{
    $group: {
      _id: '$user',
      count: { $sum: 1 },
    },
  }]);
  const ids = transactions.map(t => t._id);
  await identifyAndRemoveDuplicateTransactions({
    userQuery: { _id: { $in: ids } },
    removeDuplicates: true,
  });
};
