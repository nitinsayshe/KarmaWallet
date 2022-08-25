import {
  Schema,
  model,
  Document,
  PaginateModel,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { getUtcDate } from '../lib/date';
import { IMerchantModel } from './merchant';

export interface IWildfireMerchantRateIntegration {
  merchantId: number;
  ID: number,
  Name: string,
  Kind: string,
  Amount: number,
  Currency: string,
}

export interface IMerchantIntegrations {
  wildfire?: IWildfireMerchantRateIntegration;
  integrations: IMerchantIntegrations;
}

export interface IShareableMerchantRate {
  merchant: IRef<ObjectId, IMerchantModel>;
}

export interface IMerchantRate extends IShareableMerchantRate {
  lastModified: Date;
  createdOn: Date;
}

export type IMerchantRateModel = IModel<IMerchantRate>;

export interface IMerchantRateDocument extends IMerchantRate, Document {
  _id: ObjectId;
}

const merchantRate = new Schema({
  merchant: {
    type: Schema.Types.ObjectId,
    ref: 'merchant',
  },
  integrations: {
    wildfire: {
      type: {
        merchantId: { type: Number },
        ID: { type: Number },
        Name: { type: String },
        Kind: { type: String },
        Amount: { type: Number },
        Currency: { type: String },
      },
    },
  },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

export const MerchantRateModel = model<IMerchantRateDocument, PaginateModel<IMerchantRate>>('merchant_rate', merchantRate);
