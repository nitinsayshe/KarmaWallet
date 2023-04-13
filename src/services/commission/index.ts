import dayjs from 'dayjs';
import {
  CommissionModel,
  ICommissionDocument,
  IShareableCommission,
  KarmaCommissionStatus,
} from '../../models/commissions';
import { IRequest } from '../../types/request';
import {
  CommissionPayoutModel,
  ICommissionPayoutDocument,
  KarmaCommissionPayoutStatus,
} from '../../models/commissionPayout';
import {
  currentAccurualsQuery,
  getNextPayoutDate,
  getUserCurrentAccrualsBalance,
  getUserLifetimeCashbackPayoutsTotal,
} from './utils';
import { CommissionPayoutDayForUser } from '../../lib/constants';
import { UserModel } from '../../models/user';
import { getUtcDate } from '../../lib/date';
import { CommissionPayoutOverviewModel } from '../../models/commissionPayoutOverview';

export enum CommissionType {
  'wildfire' = 'wildfire',
  'karma' = 'karma',
  'all' = 'all'
}

export interface IGetCommissionsForUserQuery {
  id: string;
}

export interface ICommissionsRequestParams {
  type: CommissionType;
}

const defaultCommissionPopulation = [
  {
    path: 'company',
    select: 'companyName logo url',
  },
];

export const getShareableCommission = ({
  _id,
  merchant,
  company,
  status,
  createdOn,
  lastModified,
  lastStatusUpdate,
  allocation,
  amount,
}: IShareableCommission) => ({
  _id,
  merchant,
  company,
  status,
  createdOn,
  lastModified,
  lastStatusUpdate,
  amount,
  allocation: { user: allocation.user, karma: allocation.karma },
});

export const getCommissionsForAllUsers = async (req: IRequest<ICommissionsRequestParams, {}, {}>) => {
  const { type } = req.params;
  let query = {};

  if (type === CommissionType.wildfire) query = { 'integrations.wildfire': { $ne: null } };
  if (type === CommissionType.karma) query = { 'integrations.karma': { $ne: null } };

  const commissions = await CommissionModel.find(query)
    .sort({ createdOn: -1 })
    .populate(defaultCommissionPopulation);

  return commissions.map(c => getShareableCommission(c));
};

export const getCommissionsForUserByPayout = async (req: IRequest<{}, IGetCommissionsForUserQuery, {}>) => {
  const { requestor } = req;
  // no payoutID means current
  const { id } = req.query;
  if (!id) {
    const commissions = await CommissionModel.find({ user: requestor?._id, ...currentAccurualsQuery })
      .sort({ createdOn: -1 })
      .populate(defaultCommissionPopulation);
    const total = await getUserCurrentAccrualsBalance(requestor?._id);
    return { commissions: commissions.map(c => getShareableCommission(c)), total, date: getNextPayoutDate().date };
  }
  const payout = await CommissionPayoutModel.findOne({ user: requestor?._id, _id: id })
    .select('commissions amount date status')
    .populate({ path: 'commissions', populate: defaultCommissionPopulation });
  const total = payout?.amount || 0;
  let commissions: ICommissionDocument[] = payout?.commissions as any as ICommissionDocument[];
  commissions = commissions.sort((a, b) => b.createdOn.getTime() - a.createdOn.getTime());
  return { total, commissions: commissions.map(c => getShareableCommission((c as any as IShareableCommission))), date: payout?.date };
};

export const getCommissionDashboardSummary = async (req: IRequest) => {
  const { requestor } = req;
  const lifetimeCashback = await getUserLifetimeCashbackPayoutsTotal(requestor?._id);
  const payouts = await CommissionPayoutModel.find({ user: requestor?._id, status: KarmaCommissionPayoutStatus.Paid });
  const accruals = await CommissionModel.find({
    user: requestor?._id,
    ...currentAccurualsQuery,
  })
    .sort({ createdOn: -1 })
    .populate(defaultCommissionPopulation);
  const balance = await getUserCurrentAccrualsBalance(requestor?._id);
  return {
    lifetimeCashback,
    payouts,
    accruals: accruals.map(c => getShareableCommission(c)),
    balance,
    nextPayoutDate: dayjs(getNextPayoutDate().date).date(CommissionPayoutDayForUser).toDate(),
  };
};

export const generateCommissionPayoutForUsers = async (min: number, endDate?: Date, startDate?: Date) => {
  const users = await UserModel.find({ });

  for (const user of users) {
    if (!user.integrations.paypal) continue;
    try {
      let dateQuery = {};
      if (!!startDate || !!endDate) dateQuery = !startDate ? { $lte: endDate } : { $gte: startDate, $lte: endDate };

      const validUserCommissions = await CommissionModel.aggregate([
        {
          $match: {
            date: dateQuery,
            amount: { $gte: min },
            user: user._id,
            status: {
              $in: [
                KarmaCommissionStatus.ReceivedFromVendor,
                KarmaCommissionStatus.ConfirmedAndAwaitingVendorPayment,
              ],
            },
          },
        },
      ]);

      if (!validUserCommissions.length) continue;

      const commissionPayout = new CommissionPayoutModel({
        user: user._id,
        commissions: validUserCommissions.map(c => getShareableCommission(c)),
        amount: validUserCommissions.reduce((acc, c) => acc + c.amount, 0),
        // update this to be a future date?
        date: getUtcDate(),
        status: KarmaCommissionPayoutStatus.Pending,
      });
      await commissionPayout.save();
      console.log(`[+] Created CommissionPayout for user ${user._id}`);
    } catch (err) {
      console.log(`[+] Error create CommissionPayout for user ${user._id}`, err);
    }
  }
};

export const generateCommissionPayoutOverview = async (endDate?: Date, startDate?: Date) => {
  let commissionPayouts: ICommissionPayoutDocument[] = [];

  if (!!startDate || !!endDate) {
    const dateQuery = !startDate ? { $lte: endDate } : { $gte: startDate, $lte: endDate };
    commissionPayouts = await CommissionPayoutModel.find({ date: dateQuery });
  }

  if (!endDate && !startDate) commissionPayouts = await CommissionPayoutModel.find({ });

  if (!commissionPayouts.length) throw new Error('No commission payouts found for this time period.');

  try {
    const commissionPayoutOverview = new CommissionPayoutOverviewModel({
      date: getUtcDate(),
      commissionPayouts,
      amount: commissionPayouts.reduce((acc, c) => acc + c.amount, 0),
      status: KarmaCommissionPayoutStatus.Pending,
    });

    await commissionPayoutOverview.save();
    console.log('[+] Created CommissionPayoutOverview');
  } catch (err) {
    console.log('[+] Error create CommissionPayoutOverview', err);
  }
};
