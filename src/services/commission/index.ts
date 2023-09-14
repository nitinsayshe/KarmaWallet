import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery, Types } from 'mongoose';
import {
  CommissionModel,
  ICommission,
  ICommissionDocument,
  ICommissionIntegrations,
  IShareableCommission,
  KarmaCommissionStatus,
} from '../../models/commissions';
import { IRequest } from '../../types/request';
import { CommissionPayoutModel, KarmaCommissionPayoutStatus } from '../../models/commissionPayout';
import {
  currentAccurualsQuery,
  getNextPayoutDate,
  getUserCurrentAccrualsBalance,
  getUserLifetimeCashbackPayoutsTotal,
} from './utils';
import { CommissionPayoutDayForUser, ErrorTypes, UserRoles, ImpactKarmaCompanyData } from '../../lib/constants';
import { IUserDocument, UserModel } from '../../models/user';
import {
  CommissionPayoutOverviewModel,
  ICommissionPayoutOverviewDocument,
  KarmaCommissionPayoutOverviewStatus,
} from '../../models/commissionPayoutOverview';
import { ISendPayoutBatchHeader, ISendPayoutBatchItem, PaypalClient } from '../../clients/paypal';
import CustomError from '../../lib/customError';
import { IPromo } from '../../models/promo';
import { getUtcDate } from '../../lib/date';
import { createPayoutNotificationFromCommissionPayout } from '../notification';

dayjs.extend(utc);

export enum CommissionType {
  'karma' = 'karma',
  'all' = 'all',
  'wildfire' = 'wildfire',
  'kard' = 'kard',
}

export interface IAddKarmaCommissionToUserRequestParams {
  userId: string;
  promo: IPromo;
}

export interface IGetCommissionsForUserQuery {
  id: string;
}

export interface ICommissionsRequestParams {
  type: CommissionType | string;
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

const getCommissionSource = (integrations: ICommissionIntegrations): 'kard' | 'wildfire' | 'karma' | undefined => {
  if (!!integrations?.kard?.reward?.commissionToIssuer) return 'kard';
  if (!!integrations?.wildfire?.Amount?.Amount) return 'wildfire';
  if (!!integrations?.karma) return 'karma';
  return undefined;
};

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
  integrations,
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
  source: getCommissionSource(integrations),
});

const getCommissionTypes = (type: CommissionType | string): CommissionType[] => {
  const split: CommissionType[] = type.split('+') as CommissionType[];
  if (split.length < 1) {
    return [];
  }
  return split?.filter(
    (t) => t === CommissionType.karma
      || t === CommissionType.wildfire
      || t === CommissionType.kard
      || t === CommissionType.all,
  );
};

export const getCommissionsForAllUsers = async (req: IRequest<ICommissionsRequestParams, {}, {}>) => {
  const { type } = req.params;
  const query: FilterQuery<ICommission> = {};

  const commissionTypes = getCommissionTypes(type);
  if (!!commissionTypes && commissionTypes.length > 0) {
    query.$or = [];
  }
  commissionTypes.forEach((t) => {
    if (t === CommissionType.wildfire) query.$or.push({ 'integrations.wildfire': { $ne: null } });
    if (t === CommissionType.karma) query.$or.push({ 'integrations.karma': { $ne: null } });
    if (t === CommissionType.kard) query.$or.push({ 'integrations.kard': { $ne: null } });
  });

  const commissions = await CommissionModel.find(query).sort({ createdOn: -1 }).populate(defaultCommissionPopulation);

  return commissions.map((c) => getShareableCommission(c));
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
    return { commissions: commissions.map((c) => getShareableCommission(c)), total, date: getNextPayoutDate().date };
  }
  const payout = await CommissionPayoutModel.findOne({ user: requestor?._id, _id: id })
    .select('commissions amount date status')
    .populate({ path: 'commissions', populate: defaultCommissionPopulation });
  const total = payout?.amount || 0;
  let commissions: ICommissionDocument[] = payout?.commissions as any as ICommissionDocument[];
  commissions = commissions.sort((a, b) => b.createdOn.getTime() - a.createdOn.getTime());
  return {
    total,
    commissions: commissions.map((c) => getShareableCommission(c as any as IShareableCommission)),
    date: payout?.date,
  };
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
    accruals: accruals.map((c) => getShareableCommission(c)),
    balance,
    nextPayoutDate: dayjs(getNextPayoutDate().date).date(CommissionPayoutDayForUser).toDate(),
  };
};

export const generateCommissionPayoutForUsers = async (min: number) => {
  const users = await UserModel.find({});

  for (const user of users) {
    if (!user.integrations?.paypal || !user?.integrations?.marqeta?.userToken) continue;

    if (!user.integrations?.paypal?.payerId) {
      console.log(`[+] Skipping user ${user._id} - no paypal integration`);
      continue;
    }

    try {
      const validUserCommissions = await CommissionModel.aggregate([
        {
          $match: {
            user: user._id,
            status: {
              $in: [KarmaCommissionStatus.ReceivedFromVendor, KarmaCommissionStatus.ConfirmedAndAwaitingVendorPayment],
              $nin: [
                KarmaCommissionStatus.PendingPaymentToUser,
                KarmaCommissionStatus.PaidToUser,
                KarmaCommissionStatus.Failed,
              ],
            },
          },
        },
      ]);

      if (!validUserCommissions.length) continue;

      const [commissionsTotal, commissionIds] = validUserCommissions.reduce(
        (acc, c) => {
          acc[0] += c.allocation.user;
          acc[1].push(c._id);
          return acc;
        },
        [0, []],
      );

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
      await CommissionModel.updateMany(
        { _id: { $in: commissionIds } },
        { $set: { status: KarmaCommissionStatus.PendingPaymentToUser, lastStatusUpdate: getUtcDate() } },
      );
      console.log(`[+] Created CommissionPayout for user ${user._id}`);
      await createPayoutNotificationFromCommissionPayout(commissionPayout);
    } catch (err) {
      console.log(`[+] Error create CommissionPayout for user ${user._id}`, err);
    }
  }
};

export const generateCommissionPayoutOverview = async (
  payoutDate: Date,
): Promise<void | ICommissionPayoutOverviewDocument> => {
  const commissionPayouts = await CommissionPayoutModel.find({
    status: KarmaCommissionPayoutStatus.Pending,
  });
  if (!commissionPayouts.length) {
    throw new CustomError('No commission payouts found for this time period.', ErrorTypes.GEN);
  }

  // count the amounts broken down by source (karma, wildfire, kard, etc)
  // count the payout total by destination (paypal, marqeta, etc)
  let karmaAmount = 0;
  let wildfireAmount = 0;
  let kardAmount = 0;
  let paypalPayoutAmount = 0;
  let marqetaPayoutAmount = 0;
  let unknownDestinationAmount = 0;

  for (const payout of commissionPayouts) {
    const payoutCommissions = payout.commissions;

    for (const commission of payoutCommissions) {
      const commissionData: (ICommissionDocument & { user: IUserDocument })[] = await CommissionModel.aggregate()
        .match({ _id: commission })
        .lookup({
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        })
        .unwind({ path: '$user' });
      if (!commissionData?.length || commissionData.length < 1) {
        console.error('Commission not found for payout', payout._id, commission);
        continue;
      }

      if (!!commissionData?.[0]?.integrations?.karma?.amount) karmaAmount += commissionData[0].allocation.user;
      if (!!commissionData?.[0]?.integrations?.wildfire?.CommissionID) {
        wildfireAmount += commissionData[0].allocation.user;
      }
      if (!!commissionData?.[0]?.integrations?.kard?.reward) kardAmount += commissionData[0].allocation.user;

      if (!!commissionData[0]?.user?.integrations?.marqeta?.userToken) {
        marqetaPayoutAmount += commissionData[0].allocation.user;
      } else if (!!commissionData[0]?.user?.integrations?.paypal?.payerId) {
        paypalPayoutAmount += commissionData[0].allocation.user;
      } else {
        unknownDestinationAmount += commissionData[0].allocation.user;
      }
    }
  }

  try {
    const commissionPayoutOverview = new CommissionPayoutOverviewModel({
      payoutDate: getUtcDate(payoutDate).toDate(),
      commissionPayouts,
      amount: commissionPayouts?.reduce((acc, c) => acc + c.amount, 0),
      status: KarmaCommissionPayoutOverviewStatus.AwaitingVerification,
      breakdown: {
        karma: karmaAmount,
        wildfire: wildfireAmount,
        kard: kardAmount,
      },
      destination: {
        paypal: paypalPayoutAmount,
        marqeta: marqetaPayoutAmount,
        unknown: unknownDestinationAmount,
      },
    });
    console.log('[+] Created CommissionPayoutOverview');
    return commissionPayoutOverview.save();
  } catch (err) {
    console.log('[+] Error creating CommissionPayoutOverview', err);
  }
};

export const sendCommissionPayouts = async (commissionPayoutOverviewId: string) => {
  try {
    const commissionPayoutOverview = await CommissionPayoutOverviewModel.findById(commissionPayoutOverviewId);
    if (!commissionPayoutOverview) {
      throw new CustomError('Commission payout overview not found.', ErrorTypes.INVALID_ARG);
    }
    if (
      commissionPayoutOverview.status !== KarmaCommissionPayoutOverviewStatus.Verified
      && commissionPayoutOverview.status !== KarmaCommissionPayoutOverviewStatus.Success
    ) {
      throw new CustomError('Commission payout overview is not verified.', ErrorTypes.GEN);
    }

    const paypalClient = new PaypalClient();
    const paypalPrimaryBalance = await paypalClient.getPrimaryBalance();
    const paypalPrimaryBalanceAmount = paypalPrimaryBalance?.available_balance?.value || 0;
    const paypalCommissionPayoutOverviewAmount = commissionPayoutOverview.destination.paypal;

    const { commissionPayouts } = commissionPayoutOverview;

    // Check that the paypal account has enough funds to cover the users with paypal payouts
    if (paypalPrimaryBalanceAmount < paypalCommissionPayoutOverviewAmount) {
      throw new CustomError(
        `[+] Insufficient funds in PayPal account for this commission payout overview. Available balance: ${paypalPrimaryBalanceAmount}, Commission payout overview amount: ${paypalCommissionPayoutOverviewAmount}`,
        ErrorTypes.GEN,
      );
    }

    // TODO: check if there is enough money in the marqeta account to cover
    // amount in commissionPayoutOverview.destination.marqeta

    const paypalFormattedPayouts: ISendPayoutBatchItem[] = [];
    const marqetaFormattedPayouts: any[] = []; // Improve typing once we know what is needed

    const sendPayoutHeader: ISendPayoutBatchHeader = {
      sender_batch_header: {
        sender_batch_id: `${commissionPayoutOverviewId}-${getUtcDate().unix()}`,
        email_subject: "You've received a cashback payout from Karma Wallet!",
        email_message: "You've earned cashback from Karma Wallet. Great job!.",
      },
    };

    // Adding Valid Commission Payouts to Paypal Formatted Payouts Array
    // Checking that each commission payout has an associated user and hasn't alreacy benn paid
    // If so, we add it to the paypal formatted payouts array
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

      const { paypal, marqeta } = user.integrations;

      if (!paypal && !marqeta) {
        console.log('[+] User does not have paypal or marqeta integration. Skipping payout.');
        continue;
      }

      if (!!marqeta?.userToken) {
        // TODO: aggregate data needed for a marqueta payout
      } else if (!!paypal?.payerId) {
        // prepare for paypal payout
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
    }

    if (!!paypalFormattedPayouts.length) {
      const paypalResponse = await paypalClient.sendPayout(sendPayoutHeader, paypalFormattedPayouts);
      console.log('[+] Paypal payout sent', paypalResponse);
    } else {
      console.log('[-] No valid paypal payouts to send.');
    }

    if (!!marqetaFormattedPayouts.length) {
      // TODO: send marqeta payouts
    } else {
      console.log('[-] No valid marqeta payouts to send.');
    }

    // Updating our db
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
  if (user.role !== UserRoles.Admin && user.role !== UserRoles.SuperAdmin) {
    throw new CustomError('Unauthorized.', ErrorTypes.UNAUTHORIZED);
  }
  return CommissionPayoutOverviewModel.find({}).sort({ date: -1 });
};

export const updateCommissionPayoutOverviewStatus = async (
  req: IRequest<ICommissionPayoutOverviewUpdateRequestParams, {}, ICommissionPayoutOverviewUpdateBody>,
) => {
  const { commissionPayoutOverviewId } = req.params;
  const { status } = req.body;

  if (!commissionPayoutOverviewId) {
    throw new CustomError('A commission payout overview id is required.', ErrorTypes.INVALID_ARG);
  }
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
