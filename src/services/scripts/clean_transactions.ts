import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { TransactionModel } from '../../models/transaction';
import { IUserDocument, UserModel } from '../../models/user';

dayjs.extend(utc);

export const cleanTransactions = async () => {
  console.log('\ncleaning transactions...');

  let users: IUserDocument[];

  try {
    // using users for batching transactions.
    users = await UserModel.find({});

    if (!users.length) throw new CustomError('Failed to load users.', ErrorTypes.SERVER);
  } catch (err) {
    console.log(err);
  }

  if (!users.length) return;

  let count = 0;
  let failedCount = 0;

  for (const user of users) {
    try {
      const transactions = await TransactionModel.find({ userId: user });

      for (const transaction of transactions) {
        transaction.user = (transaction as any).userId;
        transaction.company = (transaction as any).companyId;
        transaction.card = (transaction as any).cardId;
        transaction.lastModified = dayjs().utc().toDate();

        await transaction.save();
        count += 1;
      }
    } catch (err) {
      failedCount += 1;
      console.log(err);
    }
  }

  const msg = failedCount > 0
    ? `${count} transactions cleaned but with ${failedCount} errors.`
    : `${count} transactions cleaned successfully.`;

  console.log(`[+] ${msg}\n`);

  console.log('\nremoving legacy properties from transactions...');
  try {
    // clean transactions of fields: category, subCategory, and carbonMultiplier
    await TransactionModel.updateMany(
      {},
      {
        $unset: {
          category: '',
          subCategory: '',
          carbonMultiplier: '',
          companyId: '',
          userId: '',
        },
      },
      { multi: true },
    );

    console.log('[+] legacy properties removed from all transactions successfully');
  } catch (err) {
    failedCount += 1;
    console.log('[-] error removing legacy properties');
    console.log(err);
  }

  return failedCount === 0;
};
