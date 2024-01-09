/* eslint-disable camelcase */
import dayjs from 'dayjs';
import { ObjectId } from 'mongoose';
import {
  EarnedRewardWebhookBody,
  KardEnvironmentEnum,
  KardEnvironmentEnumValues,
  RewardStatus,
} from '../../../clients/kard';
import { updateMadeCashBackEligiblePurchaseStatus } from '../../../integrations/activecampaign';
import { CentsInUSD, CommissionPayoutMonths, ErrorTypes, UserCommissionPercentage } from '../../../lib/constants';
import CustomError from '../../../lib/customError';
import { getUtcDate } from '../../../lib/date';
import { roundToPercision } from '../../../lib/misc';
import { CardModel } from '../../../models/card';
import { CommissionPayoutModel, KarmaCommissionPayoutStatus, PayPalPayoutItemStatus } from '../../../models/commissionPayout';
import { CommissionPayoutOverviewModel, KarmaCommissionPayoutOverviewStatus } from '../../../models/commissionPayoutOverview';
import {
  CommissionModel,
  ICommissionDocument,
  IShareableCommission,
  KarmaCommissionStatus,
  WildfireCommissionStatus,
} from '../../../models/commissions';
import { CompanyModel } from '../../../models/company';
import { MerchantModel } from '../../../models/merchant';
import { TransactionModel } from '../../../models/transaction';
import { IUserDocument, UserModel } from '../../../models/user';
import { IRef } from '../../../types/model';
import { createEarnedCashbackNotificationsFromCommission, createPayoutNotificationsFromCommissionPayout } from '../../user_notification';

export type IWildfireCommission = {
  CommissionID: number;
  ApplicationID: number;
  MerchantID: number;
  DeviceID: number;
  SaleAmount: any;
  Amount: any;
  Status: WildfireCommissionStatus;
  EventDate: Date;
  CreatedDate: Date;
  ModifiedDate: Date;
  MerchantOrderID: string;
  MerchantSKU: string;
  TrackingCode: string;
};

export const getNextPayoutDate = (date: Date = getUtcDate().toDate()) => {
  const currentMonth = getUtcDate(date).month();
  let payoutDate;
  for (const month of CommissionPayoutMonths) {
    if (month > currentMonth || (month === currentMonth && dayjs(date).date() < 15)) {
      payoutDate = getUtcDate(date).month(month).date(1).toDate();
      break;
    }
  }
  if (!payoutDate) {
    payoutDate = dayjs().month(CommissionPayoutMonths[0]).date(1).add(1, 'year')
      .toDate();
  }
  return { month: payoutDate.getMonth(), date: payoutDate };
};

export const getPrevPayoutDate = (date: Date = getUtcDate().toDate()) => {
  const currentMonth = getUtcDate(date).month();
  let payoutDate;
  const arr = [...CommissionPayoutMonths].reverse();
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

export const currentAccrualsQuery = {
  status: {
    $in: [
      KarmaCommissionStatus.Pending,
      KarmaCommissionStatus.ReceivedFromVendor,
      KarmaCommissionStatus.ConfirmedAndAwaitingVendorPayment,
      KarmaCommissionStatus.PendingPaymentToUser,
    ],
  },
};

export const getUserLifetimeCashbackPayoutsTotal = async (userId: IUserId) => {
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

export const getUserCurrentAccrualsBalance = async (userId: IUserId) => {
  const result = await CommissionModel.aggregate([
    {
      $match: {
        user: userId,
        ...currentAccrualsQuery,
      },
    },
    {
      $group: {
        _id: '$user',
        total: { $sum: '$allocation.user' },
      },
    },
  ]);
  return result[0]?.total || 0;
};

export const getKarmaCommissionStatusFromWildfireStatus = (
  wildfireStatus: WildfireCommissionStatus,
  currentKarmaStatus: KarmaCommissionStatus,
) => {
  if (currentKarmaStatus === KarmaCommissionStatus.ReceivedFromVendor && WildfireCommissionStatus.Paid === wildfireStatus) {
    return KarmaCommissionStatus.ReceivedFromVendor;
  }
  switch (wildfireStatus) {
    case WildfireCommissionStatus.Pending:
    case WildfireCommissionStatus.Ready:
      return KarmaCommissionStatus.Pending;
    case WildfireCommissionStatus.Paid:
      return KarmaCommissionStatus.ConfirmedAndAwaitingVendorPayment;
    case WildfireCommissionStatus.Disqualified:
      return KarmaCommissionStatus.Canceled;
    default:
      return KarmaCommissionStatus.Pending;
  }
};

// TODO: make sure user allocation is correct
export const mapWildfireCommissionToKarmaCommission = async (wildfireCommission: IWildfireCommission) => {
  const { CommissionID, MerchantID, Amount: AmountObject, Status, TrackingCode } = wildfireCommission;

  if (!TrackingCode) throw new Error('TrackingCode is required');

  const Amount = parseFloat(AmountObject?.Amount);
  if (Number.isNaN(Amount)) throw new Error('Invalid amount');

  // TODO: this is percentage is for now, but should be dynamic
  // allocation is done on every update
  const userAllocation = Math.floor(Amount * UserCommissionPercentage * 100) / 100;
  const karmaAllocation = Amount - userAllocation;

  const commissionData: Partial<IShareableCommission> = {
    amount: Amount,
    allocation: {
      user: userAllocation,
      karma: karmaAllocation,
    },
    lastStatusUpdate: getUtcDate().toDate(),
    integrations: {
      wildfire: wildfireCommission,
    },
  };

  const existingCommission = await CommissionModel.findOne({ 'integrations.wildfire.CommissionID': CommissionID });

  if (!existingCommission) {
    const merchant = await MerchantModel.findOne({ 'integrations.wildfire.merchantId': MerchantID });
    if (!merchant) throw new Error('Merchant not found');
    const company = await CompanyModel.findOne({ merchant: merchant?._id });
    if (!company) throw new Error('Company not found');
    const user = await UserModel.findOne({ _id: TrackingCode });
    if (!user) throw new Error('User not found');

    const newCommission = new CommissionModel({
      user: user?._id,
      company: company?._id,
      merchant: merchant?._id,
      ...commissionData,
      status: getKarmaCommissionStatusFromWildfireStatus(Status, null),
    });
    // update cash back eligible purchase status in active campaign if first commssion
    const userCommissions = await CommissionModel.find({ user: user._id });
    if (userCommissions && userCommissions.length === 0) {
      await updateMadeCashBackEligiblePurchaseStatus(user.emails.find((e) => e.primary).email);
    }

    await newCommission.save();
    return;
  }
  // if already paid to user DO NOT update the Karma Commission Status, this will revert the status back to received-from-vendor
  if (existingCommission.status === KarmaCommissionStatus.PaidToUser || existingCommission.status === KarmaCommissionStatus.Failed) {
    return;
  }
  const newStatus = getKarmaCommissionStatusFromWildfireStatus(Status, existingCommission.status);

  const updates: Partial<IShareableCommission> = {
    ...commissionData,
    status: newStatus,
  };

  if (newStatus !== existingCommission?.status) updates.lastStatusUpdate = getUtcDate().toDate();

  await CommissionModel.updateOne({ _id: existingCommission?._id }, updates);
};

export const updateCommissionOverviewStatus = async (commissionOverviewId: string, status: KarmaCommissionPayoutOverviewStatus) => {
  const commissionPayoutOverview = await CommissionPayoutOverviewModel.findOneAndUpdate({ _id: commissionOverviewId }, { status });
  if (!commissionPayoutOverview) {
    throw new CustomError(`PayoutOverview with id ${commissionOverviewId} not found`, ErrorTypes.NOT_FOUND);
  }
  console.log(`[+] Updated commission overview status to [${status}]`);
};

export const updateCommissionPayoutStatus = async (
  commissionPayoutId: string,
  status: KarmaCommissionPayoutStatus,
  paypalStatus: PayPalPayoutItemStatus,
) => {
  try {
    const commissionPayout = await CommissionPayoutModel.findOne({ _id: commissionPayoutId });
    if (!commissionPayout) {
      throw new CustomError(`Payout with id ${commissionPayoutId} not found`, ErrorTypes.NOT_FOUND);
    }

    if (paypalStatus === PayPalPayoutItemStatus.Success) {
      await createPayoutNotificationsFromCommissionPayout(commissionPayout, ['email', 'push']);
    }

    for (const commission of commissionPayout.commissions) {
      const commissionItem = await CommissionModel.findOne({ _id: commission });
      if (status === KarmaCommissionPayoutStatus.Paid) {
        commissionItem.status = KarmaCommissionStatus.PaidToUser;
        await commissionItem.save();
        console.log(`[+] Updated commission status to [${KarmaCommissionStatus.PaidToUser}]`);
      } else {
        commissionItem.status = KarmaCommissionStatus.Failed;
        await commissionItem.save();
        console.log(`[+] Updated commission status to [${KarmaCommissionStatus.PaidToUser}]`);
      }
    }

    commissionPayout.status = status;
    commissionPayout.integrations.paypal.status = paypalStatus;
    await commissionPayout.save();
    console.log(`[+] Updated commission payout status to [${status}`);
  } catch (err) {
    console.log('error updating commission payout status', err);
  }
};

export const getKarmaCommissionStatusFromKardStatus = (kardStatus: RewardStatus, currentKarmaStatus: KarmaCommissionStatus) => {
  if (currentKarmaStatus === KarmaCommissionStatus.ReceivedFromVendor && RewardStatus.SETTLED === kardStatus) {
    return KarmaCommissionStatus.ReceivedFromVendor;
  }
  switch (kardStatus) {
    case RewardStatus.APPROVED:
      return KarmaCommissionStatus.ConfirmedAndAwaitingVendorPayment;
    case RewardStatus.SETTLED:
      return KarmaCommissionStatus.ReceivedFromVendor;
    default:
      return KarmaCommissionStatus.Pending;
  }
};

const getAssociatedTransaction = async (kardEnv: KardEnvironmentEnumValues, transaction: EarnedRewardWebhookBody['transaction']) => {
  switch (kardEnv) {
    case KardEnvironmentEnum.Aggregator:
      return TransactionModel.findOne({ 'integrations.kard.id': transaction.issuerTransactionId });
    case KardEnvironmentEnum.Issuer:
      return TransactionModel.findOne({
        $or: [

          {
            $and: [
              { 'integrations.marqeta.token': { $exists: true } },
              { 'integrations.marqeta.token': transaction.issuerTransactionId },
            ],
          },
          {
            $and: [
              { 'integrations.marqeta.relatedTransactions.token': { $exists: true } },
              { 'integrations.marqeta.relatedTransactions.token': transaction.issuerTransactionId },
            ],
          }],
      });
    default:
  }
};

// card could be from our marqeta integration or from plaid
const getUserCard = async (kardEnv: KardEnvironmentEnumValues, kardUser: EarnedRewardWebhookBody['user']) => {
  switch (kardEnv) {
    case KardEnvironmentEnum.Aggregator:
      return CardModel.findOne({ 'integrations.kard.userId': kardUser?.referringPartnerUserId });
    case KardEnvironmentEnum.Issuer:
      return CardModel.findOne({ 'integrations.marqeta.user_token': kardUser?.referringPartnerUserId });
    default:
  }
};

export const mapKardCommissionToKarmaCommisison = async (
  kardEnv: KardEnvironmentEnumValues,
  kardCommission: EarnedRewardWebhookBody,
): Promise<ICommissionDocument | void> => {
  const { user: kardUser, reward, transaction, error } = kardCommission;
  if (!!error && Object.keys(error)?.length > 0) {
    console.error('Error in kard commission: ', JSON.stringify(error, null, 2));
    throw new Error('Error in kard commission');
  }

  if (!reward?.commissionToIssuer || Number.isNaN(reward?.commissionToIssuer)) {
    throw new Error('Invalid commission amount');
  }

  const userCommissionCents = reward.commissionToIssuer * UserCommissionPercentage;
  const userAllocation = roundToPercision(userCommissionCents / CentsInUSD, 2);
  const karmaAllocation = reward.commissionToIssuer / CentsInUSD - userAllocation;

  const commissionData: Partial<IShareableCommission> = {
    amount: reward.commissionToIssuer,
    allocation: {
      user: userAllocation,
      karma: karmaAllocation,
    },
    lastStatusUpdate: getUtcDate().toDate(),
    integrations: {
      kard: kardCommission,
    },
  };

  // get the associated transaction looking it up either by the id we added or the marqeta transaction id
  const associatedTransaction = await getAssociatedTransaction(kardEnv, transaction);
  if (!associatedTransaction?._id) throw new Error('Transaction not found');

  if (!!associatedTransaction?.integrations?.kard) {
    associatedTransaction.integrations.kard.rewardData = { ...transaction };
  } else {
    associatedTransaction.integrations.kard = { rewardData: { ...transaction } };
  }
  associatedTransaction?.save();

  // create a new commission if it does not exist
  const existingCommission = await CommissionModel.findOne({
    transaction: associatedTransaction._id,
  });

  if (!existingCommission?._id) {
    const merchant = await MerchantModel.findOne({
      'integrations.kard.id': reward.merchantId,
    });
    if (!merchant?._id) throw new Error('Merchant not found');

    const company = await CompanyModel.findOne({ merchant: merchant?._id });
    if (!company?._id) throw new Error('Company not found');

    const card = await getUserCard(kardEnv, kardUser);
    if (!card?._id) throw new Error(`Card not found for refferringPartnerUserId: ${kardUser?.referringPartnerUserId}`);

    const user = await UserModel.findOne({ _id: card.userId });
    if (!user?._id) throw new Error(`User not found for user id: ${card.userId}`);

    const newCommission = new CommissionModel({
      user: user._id,
      company: company?._id,
      merchant: merchant?._id,
      transaction: associatedTransaction?._id,
      ...commissionData,
      status: getKarmaCommissionStatusFromKardStatus(reward.status, null),
    });

    /* update cash back eligible purchase status in active campaign if first commssion */
    const userCommissions = await CommissionModel.find({ user: user._id });
    if (userCommissions && userCommissions.length === 0) {
      await updateMadeCashBackEligiblePurchaseStatus(user.emails.find((e) => e.primary).email);
    }

    return newCommission.save();
  }

  if (existingCommission.status === KarmaCommissionStatus.PaidToUser || existingCommission.status === KarmaCommissionStatus.Failed) {
    return;
  }
  const newStatus = getKarmaCommissionStatusFromKardStatus(reward.status, existingCommission.status);

  const updates: Partial<IShareableCommission> = {
    ...commissionData,
    status: newStatus,
  };

  if (newStatus !== existingCommission?.status) updates.lastStatusUpdate = getUtcDate().toDate();

  return CommissionModel.findByIdAndUpdate(existingCommission?._id, updates, { new: true });
};

export const processKardWebhook = async (
  kardEnv: KardEnvironmentEnumValues,
  body: EarnedRewardWebhookBody,
): Promise<CustomError | void> => {
  try {
    const commission = await mapKardCommissionToKarmaCommisison(kardEnv, body);
    if (!commission) throw Error('Error creating karma commisison');
    await createEarnedCashbackNotificationsFromCommission(commission, ['email', 'push']);
  } catch (e) {
    console.log('Error mapping kard commission to karma commission');
    console.log(e);
    return new CustomError('Error mapping kard commission to karma commission', ErrorTypes.SERVICE);
  }
};

export const aggregateCommissionTotalAndIds = (
  commissions: ICommissionDocument[],
): { commissionsTotal: number; commissionIds: ObjectId[] } => {
  const [commissionsTotal, commissionIds] = commissions.reduce(
    (acc, c) => {
      acc[0] += c.allocation.user;
      acc[1].push(c._id);
      return acc;
    },
    [0, []],
  );
  return { commissionsTotal, commissionIds };
};
