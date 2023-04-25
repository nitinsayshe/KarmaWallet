/* eslint-disable camelcase */
import dayjs from 'dayjs';
import { ObjectId } from 'mongoose';
import {
  CommissionModel,
  IShareableCommission,
  KarmaCommissionStatus,
  WildfireCommissionStatus,
} from '../../../models/commissions';
import { MerchantModel } from '../../../models/merchant';
import { CompanyModel } from '../../../models/company';
import { IUserDocument, UserModel } from '../../../models/user';
import { CommissionPayoutModel, KarmaCommissionPayoutStatus, PayPalPayoutItemStatus } from '../../../models/commissionPayout';
import { CommissionPayoutMonths, ErrorTypes } from '../../../lib/constants';
import { getUtcDate } from '../../../lib/date';
import { IRef } from '../../../types/model';
import { updateMadeCashBackEligiblePurchaseStatus } from '../../../integrations/activecampaign';
import { CommissionPayoutOverviewModel, KarmaCommissionPayoutOverviewStatus } from '../../../models/commissionPayoutOverview';
import CustomError from '../../../lib/customError';

export type IWildfireCommission = {
  CommissionID: number,
  ApplicationID: number,
  MerchantID: number,
  DeviceID: number,
  SaleAmount: any,
  Amount: any,
  Status: WildfireCommissionStatus,
  EventDate: Date,
  CreatedDate: Date,
  ModifiedDate: Date,
  MerchantOrderID: string,
  MerchantSKU: string
  TrackingCode: string,
};

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
    payoutDate = dayjs().month(CommissionPayoutMonths[0])
      .date(1)
      .add(1, 'year')
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

export const currentAccurualsQuery = {
  status: {
    $in: [
      KarmaCommissionStatus.Pending,
      KarmaCommissionStatus.ReceivedFromVendor,
      KarmaCommissionStatus.ConfirmedAndAwaitingVendorPayment,
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
        ...currentAccurualsQuery,
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

export const getKarmaCommissionStatusFromWildfireStatus = (wildfireStatus: WildfireCommissionStatus, currentKarmaStatus: KarmaCommissionStatus) => {
  if (currentKarmaStatus === KarmaCommissionStatus.ReceivedFromVendor && WildfireCommissionStatus.Paid === wildfireStatus) return KarmaCommissionStatus.ReceivedFromVendor;
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
  const {
    CommissionID,
    MerchantID,
    Amount: AmountObject,
    Status,
    TrackingCode,
  } = wildfireCommission;

  if (!TrackingCode) throw new Error('TrackingCode is required');

  const Amount = parseFloat(AmountObject?.Amount);
  if (Number.isNaN(Amount)) throw new Error('Invalid amount');

  // TODO: this is percentage is for now, but should be dynamic
  // allocation is done on every update
  const userAllocation = Math.floor((Amount * 0.75) * 100) / 100;
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
      await updateMadeCashBackEligiblePurchaseStatus(user);
    }

    await newCommission.save();
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
  // throwing error without any
  const commissionPayoutOverview: any = await CommissionPayoutOverviewModel.find({ _id: commissionOverviewId });
  if (!commissionPayoutOverview) throw new CustomError(`PayoutOverview with id ${commissionOverviewId} not found`, ErrorTypes.NOT_FOUND);
  commissionPayoutOverview.status = status;
};

export const updateCommissionPayoutStatus = async (commissionPayoutId: string, status: KarmaCommissionPayoutStatus, paypalStatus: PayPalPayoutItemStatus) => {
  try {
    const commissionPayout: any = await CommissionPayoutModel.find({ _id: commissionPayoutId });
    if (!commissionPayout) throw new CustomError(`Payout with id ${commissionPayoutId} not found`, ErrorTypes.NOT_FOUND);
    for (const commission of commissionPayout.commissions) {
      const commissionItem = await CommissionModel.findOne({ _id: commission.commissionId });
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

export const updateStatusOnCommissionItems = async (body: any) => {
  const { resource, resource_type, event_type } = body;

  // Payouts Overviews
  if (resource_type === 'payouts') {
    const { payout_batch_id } = resource;
    switch (event_type) {
      case 'PAYMENT.PAYOUTSBATCH.SUCCESS': {
        updateCommissionOverviewStatus(payout_batch_id, KarmaCommissionPayoutOverviewStatus.Success);
        break;
      }
      case 'PAYMENT.PAYOUTSBATCH.DENIED': {
        updateCommissionOverviewStatus(payout_batch_id, KarmaCommissionPayoutOverviewStatus.Denied);
        break;
      }
      case 'PAYMENT.PAYOUTSBATCH.PROCESSING': {
        updateCommissionOverviewStatus(payout_batch_id, KarmaCommissionPayoutOverviewStatus.Processing);
        break;
      }

      default:
        console.log('////// does not match any cases');
    }
  }

  // Indisvidual Payouts
  if (resource_type === 'payouts_item') {
    const payoutId = resource.payout_item.sender_item_id;
    if (!payoutId) throw new CustomError('Payout id is required');

    switch (event_type) {
      case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Paid, PayPalPayoutItemStatus.Success);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.FAILED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Failed);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.BLOCKED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Blocked);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.CANCELED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Canceled);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.DENIED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Denied);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.HELD': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Held);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.UNCLAIMED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Unclaimed);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.REFUNDED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Refunded);
        break;
      }

      default:
        console.log('////// does not match any cases');
    }
  }
};
