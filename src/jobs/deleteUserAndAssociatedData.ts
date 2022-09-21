import { SandboxedJob } from 'bullmq';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { JobNames } from '../lib/constants/jobScheduler';
import { CardModel } from '../models/card';
import { LegacyUserModel } from '../models/legacyUser';
import { TransactionModel } from '../models/transaction';
import { UserModel } from '../models/user';
import { UserGroupModel } from '../models/userGroup';
import { UserImpactTotalModel } from '../models/userImpactTotals';
import { UserMontlyImpactReportModel } from '../models/userMonthlyImpactReport';
import { UserTransactionTotalModel } from '../models/userTransactionTotals';

dayjs.extend(utc);

/**
 * deletes user object and associated data
 */

interface IDeleteUserJobOptions {
  userId: string,
}

export const exec = async ({ userId }: IDeleteUserJobOptions) => {
  if (!userId) throw new Error('userId is required');
  const user = await UserModel.findOne({ _id: userId });
  if (!user) throw new Error('user not found');

  const userGroups = await UserGroupModel.find({ user: userId });
  if (!userGroups.length) {
    console.log('no user groups found for user: deleting data and user');
    const impactReportDelete = await UserMontlyImpactReportModel.deleteMany({ user: userId });
    console.log('impact report delete:', impactReportDelete);
    const userTransactionTotalDelete = await UserTransactionTotalModel.deleteMany({ user: userId });
    console.log('user transaction total delete:', userTransactionTotalDelete);
    const userImpactTotalDelete = await UserImpactTotalModel.deleteMany({ user: userId });
    console.log('user impact total delete:', userImpactTotalDelete);
    const transactionDelete = await TransactionModel.deleteMany({ user: userId });
    console.log('transaction delete:', transactionDelete);
    const cardDelete = await CardModel.deleteMany({ userId });
    console.log('card delete:', cardDelete);
    const legacyUserDelete = await LegacyUserModel.deleteMany({ _id: user.legacyId });
    console.log('legacy user delete:', legacyUserDelete);
  }
};

export const onComplete = () => {
  console.log(`${JobNames.DeleteUserAndAssociatedData} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.DeleteUserAndAssociatedData} failed`);
  console.log(err);
};
