import dayjs from 'dayjs';
import { ObjectId } from 'mongoose';
import { CommissionModel, KarmaCommissionStatus } from '../../models/commissions';
import { IRequest } from '../../types/request';
import { CommissionPayoutMonths, CommissionPayoutDayForUser } from '../../lib/constants';
import { getUtcDate } from '../../lib/date';
import { IRef } from '../../types/model';
import { IUserDocument } from '../../models/user';
import { CommissionPayoutModel, KarmaCommissionPayoutStatus } from '../../models/commissionPayout';

export interface IGetCommissionsForUserQuery {
  id: string;
}

// export interface IGetCashbackDashboardSummary

export const getNextPayoutDate = (date: Date = getUtcDate().toDate()) => {
  const currentMonth = getUtcDate(date).month();
  let payoutDate;
  for (const month of CommissionPayoutMonths) {
    if (month > currentMonth) {
      payoutDate = getUtcDate(date).month(month).date(1).toDate();
      break;
    }
  }
  if (!payoutDate) {
    payoutDate = dayjs(date).month(CommissionPayoutMonths[0])
      .date(1)
      .add(1, 'year')
      .toDate();
  }
  return { month: payoutDate.getMonth(), date: payoutDate };
};

export const getPrevPayoutDate = (date: Date = getUtcDate().toDate()) => {
  const currentMonth = getUtcDate(date).month();
  let payoutDate;
  const arr = CommissionPayoutMonths.reverse();
  for (let i = 0; i < arr.length; i++) {
    const month = arr[i];
    if (currentMonth >= month) {
      payoutDate = dayjs(date).month(month).date(1).toDate();
      break;
    }
  }
  return { month: payoutDate.getMonth(), date: payoutDate };
};

type IUserId = string | IRef<ObjectId, IUserDocument>;

const currentAccurualsQuery = {
  status: {
    $in: [
      KarmaCommissionStatus.Pending,
      KarmaCommissionStatus.ReceivedFromVendor,
      KarmaCommissionStatus.ConfirmedAndAwaitingVendorPayment,
    ],
  },
};

const getUserLifetimeCashbackPayoutsTotal = async (userId: IUserId) => {
  const result = await CommissionPayoutModel.aggregate([
    {
      $match: {
        user: userId,
        status: 'paid',
      },
    },
    {
      $group: {
        _id: '$user',
        total: { $sum: '$amount' },
      },
    },
  ]);
  return result[0]?.total || 0;
};

const getUserCurrentAccrualsBalance = async (userId: IUserId) => {
  const result = await CommissionModel.aggregate([
    {
      $match: {
        user: userId,
        ...currentAccurualsQuery,
      },
    },
    {
      $group: {
        _id: '$user',
        total: { $sum: '$amount' },
      },
    },
  ]);
  return result[0]?.total || 0;
};

export const getCommissionsForUserByPayout = async (req: IRequest<{}, IGetCommissionsForUserQuery, {}>) => {
  const { requestor } = req;
  // no payoutID means current
  const { id } = req.query;
  if (!id) {
    const commissions = await CommissionModel.find({ user: requestor._id, ...currentAccurualsQuery });
    const total = await getUserCurrentAccrualsBalance(requestor._id);
    return { commissions, total };
  }
  const payout = await CommissionPayoutModel.findOne({ user: requestor._id, payout: id }).select('commissions amount').populate('commissions');
  const total = payout?.amount || 0;
  const commissions = payout?.commissions || [];
  return { total, commissions };
};

export const getCommissionDashboardSummary = async (req: IRequest) => {
  const { requestor } = req;
  const lifetimeCashback = await getUserLifetimeCashbackPayoutsTotal(requestor._id);
  const payouts = await CommissionPayoutModel.find({ user: requestor._id, status: KarmaCommissionPayoutStatus.Paid });
  const accruals = await CommissionModel.find({
    user: requestor._id,
    ...currentAccurualsQuery,
  });
  const balance = await getUserCurrentAccrualsBalance(requestor._id);
  return {
    lifetimeCashback,
    payouts,
    accruals,
    balance,
    nextPayoutDate: dayjs(getNextPayoutDate().date).date(CommissionPayoutDayForUser).toDate(),
  };
};
