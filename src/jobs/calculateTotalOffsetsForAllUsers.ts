import { SandboxedJob } from 'bullmq';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { JobNames } from '../lib/constants/jobScheduler';
import { mockRequest } from '../lib/constants/request';
import { ReportModel } from '../models/report';
import { TransactionModel } from '../models/transaction';
import { getCarbonOffsetsAndEmissions } from '../services/impact';

dayjs.extend(utc);

/**
 * a job that will report on all the transactions in the db
 * so we can more easily monitor if anything breaks or is
 * implemented incorrectly.
 */

export const exec = async () => {
  console.log('\ngetting total offsets for all users...');
  try {
    const res = await TransactionModel
      .aggregate([
        {
          $match: {
            'integrations.rare': {
              $exists: true,
            },
          },
        }, {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        }, {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true,
          },
        }, {
          $project: {
            _id: 0,
            user: 1,
          },
        }, {
          $group: {
            _id: null,
            user: {
              $addToSet: '$user',
            },
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
      _mockRequest.requestor = item.user;
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
