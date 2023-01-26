import {
  Schema,
  model,
  Document,
  PaginateModel,
  ObjectId,
} from 'mongoose';
import { IModel } from '../types/model';
import { getUtcDate } from '../lib/date';

export interface IWildfireDomain {
  Domain: string,
  ID: string,
  Merchant: {
    ID: Number,
    Name: string,
    MaxRate: {
      Kind: string,
      Amount: number,
      Currency: string,
    },
  },
}

export interface IWildfireCategory {
  ID: number,
  Name: string,
  ParentId: number,
}

export interface IWildfireMerchantIntegration {
  merchantId: number;
  Name: string;
  domains: IWildfireDomain[];
  PaysNewCustomersOnly?: { type: Boolean },
  ShareAndEarnDisabled?: { type: Boolean },
  Categories?: IWildfireCategory[],
}

export interface IKarmaMerchantIntegration {
  companyId: ObjectId
}

export interface IMerchantIntegrations {
  wildfire?: IWildfireMerchantIntegration;
}

export interface IShareableMerchant {
  _id: ObjectId;
  name: string;
  integrations: IMerchantIntegrations;
}

export interface IMerchant extends IShareableMerchant {
  lastModified: Date;
  createdOn: Date;
}

export type IMerchantModel = IModel<IMerchant>;

export interface IMerchantDocument extends IMerchant, Document {
  _id: ObjectId;
}

const merchant = new Schema({
  name: { type: String },
  integrations: {
    wildfire: {
      type: {
        merchantId: { type: Number },
        Name: { type: String },
        PaysNewCustomersOnly: { type: Boolean },
        ShareAndEarnDisabled: { type: Boolean },
        domains: [{
          Domain: { type: String },
          ID: { type: Number },
          Merchant: {
            ID: { type: Number },
            Name: { type: String },
            MaxRate: {
              Kind: { type: String },
              Amount: { type: Number },
              Currency: { type: String },
            },
          },
        }],
        Categories: [{
          ID: { type: Number },
          Name: { type: String },
          ParentId: { type: Number },
        }],
      },
    },
    karma: {
      type: {
        companyId: { type: Schema.Types.ObjectId, ref: 'company' },
      },
    },
  },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

export const MerchantModel = model<IMerchantDocument, PaginateModel<IMerchant>>('merchant', merchant);
