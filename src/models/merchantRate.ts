import { Schema, model, Document, PaginateModel, ObjectId } from 'mongoose';
import { IModel, IRef } from '../types/model';
import { getUtcDate } from '../lib/date';
import { IKardOffer, IMerchantModel } from './merchant';
import { OfferType, OfferSource, CommissionType } from '../clients/kard/types';

export interface IWildfireMerchantRateIntegration {
  merchantId: number;
  ID: number;
  Name: string;
  Kind: string;
  Amount: number;
  Currency: string;
}

export type KardIntegration = IKardOffer;

export interface IMerchantIntegrations {
  wildfire?: IWildfireMerchantRateIntegration;
  kard?: KardIntegration;
}

export interface IShareableMerchantRate {
  merchant: IRef<ObjectId, IMerchantModel>;
  integrations: IMerchantIntegrations;
  _id: ObjectId;
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
    kard: {
      type: {
        id: { type: String },
        name: { type: String },
        merchantId: { type: String },
        merchantLocationIds: [{ type: String }],
        offerType: { type: String, enum: Object.values(OfferType) },
        source: { type: String, enum: Object.values(OfferSource) },
        commissionType: { type: String, enum: Object.values(CommissionType) },
        isLocationSpecific: { type: Boolean },
        optInRequired: { type: Boolean },
        terms: { type: String },
        expirationDate: { type: String },
        createdDate: { type: String },
        lastModified: { type: String },
        totalCommission: { type: Number },
        minRewardAmount: { type: Number },
        maxRewardAmount: { type: Number },
        minTransactionAmount: { type: Number },
        maxTransactionAmount: { type: Number },
        redeemableOnceForOffer: { type: Boolean },
      },
    },
  },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

export const MerchantRateModel = model<IMerchantRateDocument, PaginateModel<IMerchantRate>>(
  'merchant_rate',
  merchantRate,
);
