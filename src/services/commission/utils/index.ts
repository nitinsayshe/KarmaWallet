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
import { CommissionPayoutModel } from '../../../models/commissionPayout';
import { CommissionPayoutMonths } from '../../../lib/constants';
import { getUtcDate } from '../../../lib/date';
import { IRef } from '../../../types/model';
import { updateMadeCashBackEligiblePurchaseStatus } from '../../../integrations/activecampaign';

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
      return KarmaCommissionStatus.Pending;
    case WildfireCommissionStatus.Ready:
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
