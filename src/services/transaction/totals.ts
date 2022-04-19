import { asCustomError } from '../../lib/customError';
import { TransactionModel } from '../../models/transaction';
import { UserModel } from '../../models/user';
import { ITransactionTotals } from '../../models/userTransactionTotals';

/**
 * this file contains all the logic used to calculate
 * user_transactions_totals.
 */

export const storeTotals = async () => {
  try {
    const grandTotalDollars = 0;
    const grandTotalTransactions = 0;
    const grandCompanyTotals: { [key: string]: ITransactionTotals } = {};
    const grandSectorTotals: { [key: string]: ITransactionTotals } = {};

    const users = await UserModel.find({});

    for (const user of users) {
      const userTotalDollars = 0;
      const userTotalTransactions = 0;
      const userCompanyTotals: { [key: string]: number } = {};
      const userSectorTotals: { [key: string]: number } = {};

      const transactions = await TransactionModel
        .aggregate()
        .match({ user })
        .lookup({
          from: 'company',
          localField: 'companyId',
          foreignField: '_id',
          as: 'company',
        });

      console.log(transactions);

      // for (const transaction of transactions) {
      //   if (!!transaction.companyId) {
      //     grandTotalDollars += transaction.amount;
      //     grandTotalTransactions += 1;

      //     if (!grandCompanyTotals[transaction.companyId.toString()]) {
      //       grandCompanyTotals[transaction.companyId.toString()] = {
      //         totalSpent: 0,
      //         transactionCount: 0,
      //       };
      //     }

      //     grandCompanyTotals[transaction.companyId.toString()].totalSpent += transaction.amount;
      //     grandCompanyTotals[transaction.companyId.toString()].transactionCount += 1;
      //   }

      //   if (!!transaction.sectors)
      // }
    }
  } catch (err) {
    throw asCustomError(err);
  }
};
