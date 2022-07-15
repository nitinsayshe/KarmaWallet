import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../lib/customError';
import { ITransactionDocument, TransactionAssociationReasons, TransactionModel } from '../models/transaction';
import { IUserDocument, UserModel } from '../models/user';
import { Logger } from '../services/logger';

dayjs.extend(utc);

/**
 * iterates over all negative transactions and attempts to
 * associate them with a positive transaction.
 */

const AssociationWindow = 30; // number of days the 2 transactions can be apart

export const exec = async () => {
  Logger.info('associated negative transactions to positive transactions...');

  let users: IUserDocument[];

  try {
    users = await UserModel.find({});
  } catch (err) {
    Logger.error(asCustomError(err));
  }

  if (!users.length) return;

  let associationsCount = 0;

  for (const user of users) {
    let negativeTransactions: ITransactionDocument[];

    try {
      negativeTransactions = await TransactionModel.find({
        user: user._id,
        amount: { $lt: 0 },
      });

      // filter negative transactions by ones that have not
      // already been associated with a positive transaction
      negativeTransactions = negativeTransactions.filter(t => !t.transactionAssociations.find(a => a.reason !== TransactionAssociationReasons.Reversed));
    } catch (err) {
      Logger.info(`[-] error finding negative transactions for user: ${user._id}`);
      Logger.error(asCustomError(err));
      continue;
    }

    if (!negativeTransactions?.length) continue;

    for (const negativeTransaction of negativeTransactions) {
      const thresholdDate = dayjs(negativeTransaction.date).utc().subtract(AssociationWindow, 'days').toDate();

      let positiveTransaction: ITransactionDocument;

      try {
        // use fingerprinting to find an associated positive transaction
        positiveTransaction = await TransactionModel.findOne({
          user: user._id,
          amount: Math.abs(negativeTransaction.amount),
          date: { $gte: thresholdDate },
          reversed: { $ne: true },
          company: negativeTransaction.company,
          card: negativeTransaction.card,
          sector: negativeTransaction.sector,
        });
      } catch (err) {
        Logger.info(`[-] error finding positive transaction associated with negative transaction: ${negativeTransaction._id}`);
        Logger.error(asCustomError(err));
        continue;
      }

      if (!positiveTransaction) continue;

      negativeTransaction.transactionAssociations.push({
        transaction: positiveTransaction._id,
        reason: TransactionAssociationReasons.Reversed,
      });

      positiveTransaction.reversed = true;
      positiveTransaction.transactionAssociations.push({
        transaction: negativeTransaction._id,
        reason: TransactionAssociationReasons.Reversed,
      });

      try {
        await Promise.all([
          positiveTransaction.save(),
          negativeTransaction.save(),
        ]);

        associationsCount += 1;
      } catch (err) {
        Logger.info(`[-] error saving transaction associations for negative transaction: ${negativeTransaction._id}`);
        Logger.error(asCustomError(err));
        continue;
      }
    }
  }

  return { associations: associationsCount };
};
