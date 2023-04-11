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
  KarmaCommissionPayoutStatus,
} from '../../models/commissionPayout';
import {
  currentAccurualsQuery,
  getNextPayoutDate,
  getUserCurrentAccrualsBalance,
  getUserLifetimeCashbackPayoutsTotal,
} from './utils';
import { CommissionPayoutDayForUser } from '../../lib/constants';

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

export const getUsersWithCommissionsForPayout = async () => {
  const users = await CommissionModel.aggregate([
    {
      $match: {
        status: KarmaCommissionStatus.ReceivedFromVendor,
      },
    },
    {
      $group: {
        _id: '$user',
        count: { $sum: 1 },
      },
    },
  ]);
  return users;
};
