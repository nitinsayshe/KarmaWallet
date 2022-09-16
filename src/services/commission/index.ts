import dayjs from 'dayjs';
import { CommissionModel, IShareableCommission } from '../../models/commissions';
import { IRequest } from '../../types/request';
import { CommissionPayoutDayForUser } from '../../lib/constants';
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

export interface IGetCommissionsForUserQuery {
  id: string;
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
  amount,
  status,
  createdOn,
  lastModified,
  lastStatusUpdate,
  allocation,
}: IShareableCommission) => ({
  _id,
  merchant,
  company,
  amount,
  status,
  createdOn,
  lastModified,
  lastStatusUpdate,
  allocation: { user: allocation.user },
});

export const getCommissionsForUserByPayout = async (req: IRequest<{}, IGetCommissionsForUserQuery, {}>) => {
  const { requestor } = req;
  // no payoutID means current
  const { id } = req.query;
  if (!id) {
    const commissions = await CommissionModel.find({ user: requestor._id, ...currentAccurualsQuery })
      .populate({ path: 'commissions', populate: defaultCommissionPopulation });
    const total = await getUserCurrentAccrualsBalance(requestor._id);
    return { commissions: commissions.map(c => getShareableCommission(c)), total, date: getNextPayoutDate().date };
  }
  const payout = await CommissionPayoutModel.findOne({ user: requestor._id, _id: id })
    .select('commissions amount date status')
    .populate({ path: 'commissions', populate: defaultCommissionPopulation });
  const total = payout?.amount || 0;
  const commissions = payout?.commissions || [];
  return { total, commissions: commissions.map(c => getShareableCommission((c as any as IShareableCommission))), date: payout.date };
};

export const getCommissionDashboardSummary = async (req: IRequest) => {
  const { requestor } = req;
  const lifetimeCashback = await getUserLifetimeCashbackPayoutsTotal(requestor._id);
  const payouts = await CommissionPayoutModel.find({ user: requestor._id, status: KarmaCommissionPayoutStatus.Paid });
  const accruals = await CommissionModel.find({
    user: requestor._id,
    ...currentAccurualsQuery,
  })
    .populate(defaultCommissionPopulation);
  const balance = await getUserCurrentAccrualsBalance(requestor._id);
  return {
    lifetimeCashback,
    payouts,
    accruals: accruals.map(c => getShareableCommission(c)),
    balance,
    nextPayoutDate: dayjs(getNextPayoutDate().date).date(CommissionPayoutDayForUser).toDate(),
  };
};
