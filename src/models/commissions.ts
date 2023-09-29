import { Document, model, ObjectId, PaginateModel, Schema } from 'mongoose';
import { EarnedReward, RewardStatus, RewardType } from '../clients/kard';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { IShareableCompany } from './company';
import { IShareableMerchant } from './merchant';
import { IPromo } from './promo';
import { IShareableUser } from './user';

// https://kb.wildfire-corp.com/article/ygwr-commission-history
export enum WildfireCommissionStatus {
  Pending = 'PENDING',
  Paid = 'PAID',
  Disqualified = 'DISQUALIFIED',
  Ready = 'READY',
}

export enum KarmaCommissionStatus {
  Pending = 'pending',
  ConfirmedAndAwaitingVendorPayment = 'confirmed-and-awaiting-vendor-payment',
  ReceivedFromVendor = 'received-from-vendor',
  PendingPaymentToUser = 'pending-payment-to-user',
  PaidToUser = 'paidToUser',
  Canceled = 'canceled',
  Failed = 'failed',
}

export interface IKardCommissionIntegration {
  reward?: EarnedReward;
  error?: string;
}

export interface IWildfireCommissionIntegration {
  CommissionID: number;
  ApplicationID: number;
  MerchantID: number;
  DeviceID: number;
  SaleAmount: {
    Amount: string;
    Currency: string;
  };
  Amount: {
    Amount: string;
    Currency: string;
  };
  Status: WildfireCommissionStatus;
  EventDate: Date;
  CreatedDate: Date;
  ModifiedDate: Date;
  MerchantOrderID: string;
  MerchantSKU: string;
}

export interface IKarmaInternalCommissionIntegration {
  amount: number;
  createdOn: Date;
  promo: IRef<ObjectId, IPromo>;
}

export interface ICommissionIntegrations {
  wildfire?: IWildfireCommissionIntegration;
  karma?: IKarmaInternalCommissionIntegration;
  kard?: IKardCommissionIntegration;
}

export interface IShareableCommission {
  _id: ObjectId;
  merchant: IRef<ObjectId, IShareableMerchant>;
  company: IRef<ObjectId, IShareableCompany>;
  user: IRef<ObjectId, IShareableUser>;
  amount: number;
  date: Date;
  lastStatusUpdate: Date;
  allocation: {
    karma: number;
    user: number;
  };
  status: KarmaCommissionStatus;
  lastModified: Date;
  createdOn: Date;
  integrations: ICommissionIntegrations;
}

export interface ICommission extends IShareableCommission {
  _id: ObjectId;
}

export interface ICommissionDocument extends ICommission, Document {
  _id: ObjectId;
}

export type IComissionModel = IModel<ICommission>;

const commission = new Schema({
  merchant: {
    type: Schema.Types.ObjectId,
    ref: 'merchant',
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'company',
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  transaction: {
    type: Schema.Types.ObjectId,
    ref: 'transaction',
  },
  // comission amount total from vendor (i.e. what Karma receives from vendor)
  amount: { type: Number },
  date: { type: Date },
  status: { type: String, enum: Object.values(KarmaCommissionStatus) },
  lastStatusUpdate: { type: Date },
  allocation: {
    user: { type: Number },
    karma: { type: Number },
  },
  lastModified: { type: Date, default: () => getUtcDate() },
  createdOn: { type: Date, default: () => getUtcDate() },
  integrations: {
    wildfire: {
      CommissionID: { type: Number },
      ApplicationID: { type: Number },
      MerchantID: { type: Number },
      DeviceID: { type: Number },
      SaleAmount: {
        Amount: { type: String },
        Currency: { type: String },
      },
      Amount: {
        Amount: { type: String },
        Currency: { type: String },
      },
      Status: { type: String, enum: Object.values(WildfireCommissionStatus) },
      EventDate: { type: Date },
      CreatedDate: { type: Date },
      ModifiedDate: { type: Date },
      MerchantOrderID: { type: String },
      MerchantSKU: { type: String },
      TrackingCode: { type: String },
    },
    karma: {
      amount: { type: Number },
      promo: { type: Schema.Types.ObjectId, ref: 'promo' },
    },
    kard: {
      reward: {
        name: { type: String }, // merchant name
        merchantId: { type: String },
        type: { type: String, enum: Object.values(RewardType) },
        status: { type: String, enum: Object.values(RewardStatus) },
        commissionToIssuer: { type: Number },
      },
      error: {
        type: String,
      },
    },
  },
});

export const CommissionModel = model<ICommissionDocument, PaginateModel<ICommission>>('commission', commission);

/*
{
      "CommissionID": 13400791,
      "ApplicationID": 3,
      "MerchantID": 71902,
      "DeviceID": 1,
      "SaleAmount": {
        "Amount": "0",
        "Currency": "EUR"
      },
      "Amount": {
        "Amount": "0",
        "Currency": "USD"
      },
      "Status": "PENDING",
      "EventDate": "2022-08-27T00:00:00Z",
      "CreatedDate": "2022-08-28T00:20:09.35991Z",
      "ModifiedDate": "2022-08-28T00:20:09.35991Z",
      "MerchantOrderID": "1178011328",
      "MerchantSKU": ""
    },
    {
      "CommissionID": 13400969,
      "ApplicationID": 3,
      "MerchantID": 5483208,
      "DeviceID": 15848787,
      "SaleAmount": {
        "Amount": "236",
        "Currency": "USD"
      },
      "Amount": {
        "Amount": "0",
        "Currency": "USD"
      },
      "Status": "DISQUALIFIED",
      "EventDate": "2022-08-28T00:43:30Z",
      "CreatedDate": "2022-08-28T01:18:38.916892Z",
      "ModifiedDate": "2022-08-28T01:18:38.916892Z",
      "MerchantOrderID": "36-18724/FLO08282022",
      "MerchantSKU": "0D005CB2A985F796"
    }
    */
