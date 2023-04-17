import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
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
import { CommissionPayoutDayForUser, UserRoles } from '../../lib/constants';
import { UserModel } from '../../models/user';
import { getUtcDate } from '../../lib/date';
import { CommissionPayoutOverviewModel, KarmaCommissionPayoutOverviewStatus } from '../../models/commissionPayoutOverview';
import { ISendPayoutBatchHeader, ISendPayoutBatchItem, PaypalClient } from '../../clients/paypal';

dayjs.extend(utc);

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
    let dateQuery: any = { $lte: dayjs().utc().toDate() };

    try {
      if (!!startDate || !!endDate) {
        dateQuery = !startDate ? { $lte: endDate } : { $gte: startDate, $lte: endDate };
      }

      const validUserCommissions = await CommissionModel.aggregate([
        {
          $match: {
            user: user._id,
            createdOn: dateQuery,
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

      const commissionsTotal = validUserCommissions.reduce((acc, c) => acc + c.allocation.user, 0);
      if (commissionsTotal < min) continue;

      const commissionPayout = new CommissionPayoutModel({
        user: user._id,
        commissions: validUserCommissions.map(c => getShareableCommission(c)),
        amount: commissionsTotal,
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

export const generateCommissionPayoutOverview = async (payoutDate: Date, endDate?: Date, startDate?: Date) => {
  let commissionPayouts: ICommissionPayoutDocument[] = [];
  let karmaAmount = 0;
  let wildfireAmount = 0;

  if (!!startDate || !!endDate) {
    const dateQuery = !startDate ? { $lte: endDate } : { $gte: startDate, $lte: endDate };
    commissionPayouts = await CommissionPayoutModel.find({ date: dateQuery });
  }

  if (!endDate && !startDate) commissionPayouts = await CommissionPayoutModel.find({ });
  if (!commissionPayouts.length) throw new Error('No commission payouts found for this time period.');

  for (const payout of commissionPayouts) {
    const payoutCommissions = payout.commissions;
    for (const commission of payoutCommissions) {
      const commissionData = await CommissionModel.findById(commission);
      if (!!commissionData.integrations.karma.amount) karmaAmount += commissionData.allocation.user;
      if (!!commissionData.integrations.wildfire.CommissionID) wildfireAmount += commissionData.allocation.user;
    }
  }

  try {
    const commissionPayoutOverview = new CommissionPayoutOverviewModel({
      payoutDate: getUtcDate(payoutDate),
      commissionPayouts,
      amount: commissionPayouts.reduce((acc, c) => acc + c.amount, 0),
      status: KarmaCommissionPayoutOverviewStatus.AwaitingVerification,
      breakdown: {
        karma: karmaAmount,
        wildfire: wildfireAmount,
      },
    });

    await commissionPayoutOverview.save();
    console.log('[+] Created CommissionPayoutOverview');
  } catch (err) {
    console.log('[+] Error create CommissionPayoutOverview', err);
  }
};

export const sendCommissionPayoutsThruPaypal = async (commissionPayoutOverviewId: string) => {
  try {
    const commissionPayoutOverview = await CommissionPayoutOverviewModel.findById(commissionPayoutOverviewId);
    if (!commissionPayoutOverview) throw new Error('Commission payout overview not found.');
    const paypalClient = await new PaypalClient();
    const paypalPrimaryBalance = await paypalClient.getPrimaryBalance();
    const paypalPrimaryBalanceAmount = paypalPrimaryBalance?.available_balance?.value || 0;
    const commissionPayoutOverviewAmount = commissionPayoutOverview.amount;
    const { commissionPayouts } = commissionPayoutOverview;

    if (paypalPrimaryBalanceAmount < commissionPayoutOverviewAmount) {
      throw new Error('Insufficient funds in paypal account to payout this commission payout overview.');
    }

    for (const commissionPayout of commissionPayouts) {
      const payoutData = await CommissionPayoutModel.findById(commissionPayout);
      if (!payoutData) throw new Error('Commission payout not found.');
      const user = await UserModel.findById(payoutData.user);
      if (!user) throw new Error('User not found.');
      const { paypal } = user.integrations;
      if (!paypal) throw new Error('User does not have paypal integration.');
      if (!paypal.payerId) throw new Error('User does not have paypal payerId.');
      if (payoutData.status === KarmaCommissionPayoutStatus.Paid) throw new Error('Commission payout already paid.');

      const paypalFormattedPayouts: ISendPayoutBatchItem[] = [
        {
          recipient_type: 'PAYPAL_ID',
          amount: {
            value: payoutData.amount.toString(),
            currency: 'USD',
          },
          receiver: paypal.payerId,
          note: 'Karma Wallet Cashback Payout - Thank you for using Karma Wallet!',
          sender_item_id: payoutData._id.toString(),
        },
      ];

      const sendPayoutHeader: ISendPayoutBatchHeader = {
        sender_batch_header: {
          sender_batch_id: payoutData._id.toString(),
          email_subject: 'You\'ve received a payout from Karma Wallet!',
          email_message: 'Your payout for Karma Wallet is on its way. If',
        },
      };

      await paypalClient.sendPayout(sendPayoutHeader, paypalFormattedPayouts);
      console.log('[+] Paypal payout sent', payoutData._id);
    }
  } catch (err: any) {
    throw new Error(err);
  }
};

export const getAllCommissionPayoutOverviews = async (req: IRequest) => {
  const { requestor } = req;
  const user = await UserModel.findById(requestor?._id);
  if (!user) throw new Error('User not found.');
  if (user.role !== UserRoles.Admin && user.role !== UserRoles.SuperAdmin) throw new Error('Unauthorized.');

  const commissionPayoutOverviews = await CommissionPayoutOverviewModel.find({ }).sort({ date: -1 });

  return commissionPayoutOverviews;
};

// need to add in service to update the status of the commission payout overview
