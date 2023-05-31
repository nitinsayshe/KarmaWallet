import { SandboxedJob } from 'bullmq';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { UserRoles } from '../lib/constants';
import { JobNames } from '../lib/constants/jobScheduler';
import { mockRequest } from '../lib/constants/request';
import { ReportModel } from '../models/report';
import { TransactionModel } from '../models/transaction';
import { UserModel } from '../models/user';
import { getCarbonOffsetsAndEmissions } from '../services/impact';

dayjs.extend(utc);

/**
 * a job that will report on all the transactions in the db
 * so we can more easily monitor if anything breaks or is
 * implemented incorrectly.
 */

// const { APP_USER_ID } = process.env;

export const exec = async () => {
  console.log('\ngetting total offsets for all users...');
  try {
    const appUser = await UserModel.findOne({ role: UserRoles.SuperAdmin });

    const res = await TransactionModel
      .aggregate([
        {
          $match: {
            'integrations.rare': { $exists: true },
            amount: { $gt: 0 },
            reversed: { $ne: true },
          },
        }, {
          $group: {
            _id: '$user',
          },
        }, {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        }, {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);

    const _mockRequest = { ...mockRequest };

    let totalDollars = 0;
    let totalTons = 0;

    for (const item of res) {
      _mockRequest.requestor = appUser;
      _mockRequest.query = { userId: item.user._id };
      const offsetsAndEmissions = await getCarbonOffsetsAndEmissions(_mockRequest);

      totalDollars += offsetsAndEmissions.offsets.totalDonated;
      totalTons += offsetsAndEmissions.offsets.totalOffset;
    }

    const report = new ReportModel({
      totalOffsetsForAllUsers: {
        dollars: totalDollars,
        tons: totalTons,
      },
      createdOn: dayjs().utc().toDate(),
    });

    await report.save();
  } catch (err) {
    console.log('[-] error getting total offsets for all users');
    console.log(err);
  }
};

export const onComplete = () => {
  console.log(`${JobNames.TotalOffsetsForAllUsers} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.TotalOffsetsForAllUsers} failed`);
  console.log(err);
};
