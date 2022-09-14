import {
  Schema,
  model,
  Document,
  PaginateModel,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { getUtcDate } from '../lib/date';
import { IShareableMerchant } from './merchant';
import { IShareableCompany } from './company';
import { IShareableUser } from './user';

export enum WildfireComissionStatus {
  Pending = 'PENDING',
  Paid = 'PAID',
  Disqualified = 'DISQUALIFIED',
  Ready = 'READY',
}

export enum KarmaComissionStatus {
  Pending = 'pending',
  ConfirmedAndAwaitingVendorPayment = 'confirmed-and-awaiting-vendor-payment',
  ReceivedFromVendor = 'received-from-vendor',
  PaidToUser = 'paidToUser',
  Canceled = 'canceled',
}

export interface IWildfireComissionIntegration {
  CommissionID: number,
  ApplicationID: number,
  MerchantID: number,
  DeviceID: number,
  SaleAmount: {
    Amount: string,
    Currency: string
  },
  Amount: {
    Amount: string,
    Currency: string
  },
  Commission: number,
  Status: WildfireComissionStatus,
  EventDate: Date,
  CreatedDate: Date,
  ModifiedDate: Date,
  MerchantOrderID: string,
  MerchantSKU: string
}

export interface IComissionIntegrations {
  wildfire?: IWildfireComissionIntegration;
}

export interface IShareableComission {
  _id: ObjectId;
  merchant: IRef<ObjectId, IShareableMerchant>;
  company: IRef<ObjectId, IShareableCompany>;
  user: IRef<ObjectId, IShareableUser>;
  amount: number;
  date: Date;
  lastStatusUpdate: Date;
  allocation: {
    karma: number,
    user: number,
  };
  status: KarmaComissionStatus;
  lastModified: Date;
  createdOn: Date;
  integrations: IComissionIntegrations;
}

export interface IComission extends IShareableComission {
  _id: ObjectId;
}

export interface IComissionDocument extends IComission, Document {
  _id: ObjectId;
}

export type IComissionModel = IModel<IComission>;

const comission = new Schema({
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
  // comission amount total from vendor (i.e. what Karma receives from vendor)
  amount: { type: Number },
  date: { type: Date },
  status: { type: String, enum: Object.values(KarmaComissionStatus) },
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
      Commission: { type: Number },
      Status: { type: String, enum: Object.values(WildfireComissionStatus) },
      EventDate: { type: Date },
      CreatedDate: { type: Date },
      ModifiedDate: { type: Date },
      MerchantOrderID: { type: String },
      MerchantSKU: { type: String },
      TrackingCode: { type: String },
    },
  },
});

export const ComissionModel = model<IComissionDocument, PaginateModel<IComission>>('comission', comission);

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
