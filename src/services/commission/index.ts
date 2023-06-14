import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Types } from 'mongoose';
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
import { CommissionPayoutDayForUser, ErrorTypes, UserRoles, ImpactKarmaCompanyData } from '../../lib/constants';
import { UserModel } from '../../models/user';
import { CommissionPayoutOverviewModel, KarmaCommissionPayoutOverviewStatus } from '../../models/commissionPayoutOverview';
import { ISendPayoutBatchHeader, ISendPayoutBatchItem, PaypalClient } from '../../clients/paypal';
import CustomError from '../../lib/customError';
import { IPromo } from '../../models/promo';
import { getUtcDate } from '../../lib/date';

dayjs.extend(utc);

export enum CommissionType {
  'karma' = 'karma',
  'all' = 'all',
  'wildfire' = 'wildfire'
}

export interface IAddKarmaCommissionToUserRequestParams {
  userId: string,
  promo: IPromo;
}

export interface IGetCommissionsForUserQuery {
  id: string;
}

export interface ICommissionsRequestParams {
  type: CommissionType;
}

export interface ICommissionPayoutOverviewUpdateBody {
  status: KarmaCommissionPayoutOverviewStatus;
}

export interface ICommissionPayoutOverviewUpdateRequestParams {
  commissionPayoutOverviewId: string;
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
  const users = await UserModel.find({});

  for (const user of users) {
    if (!user.integrations?.paypal) continue;

    if (!user.integrations?.paypal?.payerId) {
      console.log(`[+] Skipping user ${user._id} - no paypal integration`);
      continue;
    }

    if (!user.integrations.paypal.verified_account) {
      console.log(`[+] Skipping user ${user._id} - paypal account not verified`);
      continue;
    }

    let dateQuery: any = { $lte: dayjs().utc().toDate() };

    try {
      // check time of date the dayjs endDate and startDate to ensure includes entire day
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

      const [commissionsTotal, commissionIds] = validUserCommissions.reduce((acc, c) => {
        acc[0] += c.allocation.user;
        acc[1].push(c._id);
        return acc;
      }, [0, []]);

      if (commissionsTotal < min) continue;

      const commissionPayout = new CommissionPayoutModel({
        user: user._id,
        commissions: commissionIds,
        amount: commissionsTotal,
        // update this to be a future date?
        date: getUtcDate().toDate(),
        status: KarmaCommissionPayoutStatus.Pending,
      });
      await commissionPayout.save();
      await CommissionModel.updateMany({ _id: { $in: commissionIds } }, { $set: { status: KarmaCommissionStatus.PendingPaymentToUser, lastStatusUpdate: getUtcDate() } });
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
  if (!commissionPayouts.length) throw new CustomError('No commission payouts found for this time period.', ErrorTypes.GEN);

  for (const payout of commissionPayouts) {
    const payoutCommissions = payout.commissions;
    for (const commission of payoutCommissions) {
      const commissionData = await CommissionModel.findById(commission);
      if (!!commissionData.integrations.karma.amount) karmaAmount += commissionData.allocation.user;
      if (!!commissionData.integrations.wildfire.CommissionID) wildfireAmount += commissionData.allocation.user;
      // add kard here
    }
  }

  try {
    const commissionPayoutOverview = new CommissionPayoutOverviewModel({
      payoutDate: getUtcDate(payoutDate).toDate(),
      commissionPayouts,
      amount: commissionPayouts.reduce((acc, c) => acc + c.amount, 0),
      status: KarmaCommissionPayoutOverviewStatus.AwaitingVerification,
      breakdown: {
        karma: karmaAmount,
        wildfire: wildfireAmount,
        // add kard at some point
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
    if (!commissionPayoutOverview) throw new CustomError('Commission payout overview not found.', ErrorTypes.INVALID_ARG);
    if (commissionPayoutOverview.status !== KarmaCommissionPayoutOverviewStatus.Verified && commissionPayoutOverview.status !== KarmaCommissionPayoutOverviewStatus.Success) {
      throw new CustomError('Commission payout overview is not verified.', ErrorTypes.GEN);
    }
    const paypalClient = await new PaypalClient();
    const paypalPrimaryBalance = await paypalClient.getPrimaryBalance();
    const paypalPrimaryBalanceAmount = paypalPrimaryBalance?.available_balance?.value || 0;
    const commissionPayoutOverviewAmount = commissionPayoutOverview.amount;
    const { commissionPayouts } = commissionPayoutOverview;

    if (paypalPrimaryBalanceAmount < commissionPayoutOverviewAmount) {
      throw new CustomError(`[+] Insufficient funds in PayPal account for this commission payout overview. Available balance: ${paypalPrimaryBalanceAmount}, Commission payout overview amount: ${commissionPayoutOverviewAmount}`, ErrorTypes.GEN);
    }

    const paypalFormattedPayouts: ISendPayoutBatchItem[] = [];

    const sendPayoutHeader: ISendPayoutBatchHeader = {
      sender_batch_header: {
        sender_batch_id: `${commissionPayoutOverviewId}-${getUtcDate().unix()}`,
        email_subject: 'You\'ve received a cashback payout from Karma Wallet!',
        email_message: 'You\'ve earned cashback from Karma Wallet. Great job!.',
      },
    };

    for (const commissionPayout of commissionPayouts) {
      const payoutData = await CommissionPayoutModel.findById(commissionPayout);
      if (!payoutData) {
        console.log('[+] Commission payout not found. Skipping payout.');
        continue;
      }

      if (payoutData.status === KarmaCommissionPayoutStatus.Paid) {
        console.log('[+] Commission payout already paid. Skipping payout.');
        continue;
      }

      const user = await UserModel.findById(payoutData.user);
      if (!user) {
        console.log('[+] User not found. Skipping payout.');
        continue;
      }

      const { paypal } = user.integrations;

      if (!paypal) {
        console.log('[+] User does not have paypal integration. Skipping payout.');
        continue;
      }

      if (!!paypal && !paypal.verified_account) {
        console.log('[+] User does not have verified paypal account. Skipping payout.');
        continue;
      }

      if (!paypal.payerId) {
        console.log('[+] User does not have paypal payerId. Skipping payout.');
        continue;
      }

      paypalFormattedPayouts.push({
        recipient_type: 'PAYPAL_ID',
        amount: {
          value: payoutData.amount.toString(),
          currency: 'USD',
        },
        receiver: paypal.payerId,
        note: 'Ready to earn even more? Browse thousands of company ratings then shop sustainably to earn cashback on Karma Wallet.',
        sender_item_id: payoutData._id.toString(),
      });
    }

    if (!paypalFormattedPayouts.length) console.log('[+] No valid payouts to send.');

    const paypalResponse = await paypalClient.sendPayout(sendPayoutHeader, paypalFormattedPayouts);
    console.log('[+] Paypal payout sent', paypalResponse);

    commissionPayoutOverview.status = KarmaCommissionPayoutOverviewStatus.Sent;
    await commissionPayoutOverview.save();
  } catch (err: any) {
    throw new Error(err);
  }
};

export const getAllCommissionPayoutOverviews = async (req: IRequest) => {
  const { _id } = req.requestor;
  const user = await UserModel.findById(_id);
  if (!user) throw new CustomError('User not found.', ErrorTypes.NOT_FOUND);
  if (user.role !== UserRoles.Admin && user.role !== UserRoles.SuperAdmin) throw new CustomError('Unauthorized.', ErrorTypes.UNAUTHORIZED);
  return CommissionPayoutOverviewModel.find({ }).sort({ date: -1 });
};

export const updateCommissionPayoutOverviewStatus = async (req: IRequest<ICommissionPayoutOverviewUpdateRequestParams, {}, ICommissionPayoutOverviewUpdateBody>) => {
  const { commissionPayoutOverviewId } = req.params;
  const { status } = req.body;

  if (!commissionPayoutOverviewId) throw new CustomError('A commission payout overview id is required.', ErrorTypes.INVALID_ARG);
  if (!status) throw new CustomError('A status is required.', ErrorTypes.INVALID_ARG);
  const commissionPayoutOverview = await CommissionPayoutOverviewModel.findById(commissionPayoutOverviewId);
  if (!commissionPayoutOverview) throw new CustomError('Commission payout overview not found.', ErrorTypes.NOT_FOUND);

  commissionPayoutOverview.status = status;
  commissionPayoutOverview.save();

  if (status === KarmaCommissionPayoutOverviewStatus.Verified) {
    // update the status of the individual commissions to received from vendor
    const payouts = await CommissionPayoutModel.find({ _id: { $in: commissionPayoutOverview.commissionPayouts } });
    for (const payout of payouts) {
      const commissions = await CommissionModel.find({ _id: { $in: payout.commissions } });
      for (const commission of commissions) {
        commission.status = KarmaCommissionStatus.ReceivedFromVendor;
        commission.save();
      }
    }
  }
  return commissionPayoutOverview;
};

export const addCashbackToUser = async (req: IRequest<IAddKarmaCommissionToUserRequestParams>) => {
  const { userId, promo } = req.params;

  const newCommission = await new CommissionModel({
    merchant: new Types.ObjectId(ImpactKarmaCompanyData.merchantId),
    company: new Types.ObjectId(ImpactKarmaCompanyData.companyId),
    user: new Types.ObjectId(userId),
    amount: promo.amount,
    allocation: {
      user: promo.amount,
      karma: 0,
    },
    status: KarmaCommissionStatus.ConfirmedAndAwaitingVendorPayment,
    integrations: {
      karma: {
        promo,
        amount: promo.amount,
      },
    },
  });

  await newCommission.save();
};
