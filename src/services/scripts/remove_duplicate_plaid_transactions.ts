import { ITransactionDocument, TransactionModel } from '../../models/transaction';

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

const buildFingerPrintQuery = (transaction: ITransactionDocument) => ({
  $or: [
    {
      _id: transaction._id,
    },
    {
      'integrations.plaid.transaction_id': transaction?.integrations?.plaid?.transaction_id,
    },
    {
      $and: [
        { 'integrations.plaid.pending_transaction_id': transaction?.integrations?.plaid?.pending_transaction_id },
        // @ts-ignore
        { 'integrations.plaid.pending_transaction_id': { $ne: null } },
      ],
    },
    {
      $and: [
        { user: transaction?.user },
        { card: transaction?.card },
        { company: transaction?.company },
        { amount: transaction?.amount },
        {
          $or: [
            { 'integrations.plaid.name': transaction?.integrations?.plaid?.name },
            { 'integrations.plaid.merchant_name': transaction?.integrations?.plaid?.merchant_name },
          ],
        },
        { date: transaction?.date },
      ],
    },
  ],
});

export const removeManualDuplicates = async (duplicateIds: string[]) => {
  let duplicateCount = 0;
  let count = 0;
  for (const transactionId of duplicateIds) {
    console.log(`\n[i] processing transaction ${transactionId} | ${count} / ${duplicateIds.length}`);
    count += 1;
    const transaction = await TransactionModel.findOne({
      _id: transactionId,
    });
    if (!transaction) {
      console.log(`[e] transaction ${transactionId} not found`);
      continue;
    }
    console.log(`[i] finding duplicates for ${transaction._id}`);
    const query = buildFingerPrintQuery(transaction);
    const duplicates = await TransactionModel.find(query);
    console.log(`[#] found ${duplicates.length} transaction matching fingerprint`);
    console.log(`[#] duplicate ids: ${duplicates.map(t => t._id)} `);
    if (duplicates?.length > 1) {
      const idsToDelete = duplicates.slice(1).map(t => t._id);
      console.log(`[#] identified ${idsToDelete.length} duplicates for ${transactionId}`);
      console.log(`[#] ids to delete: ${idsToDelete.map(t => t._id)} `);
      await TransactionModel.deleteMany({ _id: { $in: idsToDelete } });
      duplicateCount += idsToDelete.length;
      console.log(`[-] deleted ${idsToDelete.length} transactions for this ID`);
      console.log(`[-] deleted ${duplicateCount} duplicate transactions in total`);
    }
  }
};
