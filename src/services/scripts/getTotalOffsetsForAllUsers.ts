// will calculate the total offsets purchased in both
// MT and $ by all users

import { mockRequest } from '../../lib/constants/request';
import { TransactionModel } from '../../models/transaction';
import { getCarbonOffsetsAndEmissions } from '../impact';

export const getTotalOffsetsForAllUsers = async () => {
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

    console.log(`\ntotal donated by all users: $${totalDollars.toFixed(2)}`);
    console.log(`total offset by all users: ${totalTons.toFixed(2)} MT\n`);
  } catch (err) {
    console.log('[-] error getting total offsets for all users');
    console.log(err);
  }
};
