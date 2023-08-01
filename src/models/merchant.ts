import { Document, model, ObjectId, PaginateModel, Schema } from 'mongoose';
import { MerchantSource, OfferType, OfferSource, CommissionType } from '../clients/kard';
import { CardNetwork } from '../lib/constants';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export interface IKardOffer {
  id: string;
  name: string;
  merchantId: string;
  merchantLocationIds?: string[]; // location ids when isLocationSpecific is true
  offerType: OfferType;
  source?: OfferSource;
  commissionType: CommissionType;
  isLocationSpecific: boolean;
  optInRequired?: boolean;
  terms?: string;
  expirationDate: string;
  createdDate: string;
  lastModified: string;
  startDate?: string;
  redeemableOnce?: boolean;
  totalCommission: number;
  minRewardAmount?: number;
  maxRewardAmount?: number;
  minTransactionAmount?: number;
  maxTransactionAmount?: number;
}
export interface IWildfireDomain {
  Domain: string;
  ID: string;
  Merchant: {
    ID: Number;
    Name: string;
    MaxRate: {
      Kind: string;
      Amount: number;
      Currency: string;
    };
  };
}

export interface IWildfireCategory {
  ID: number;
  Name: string;
  ParentId: number;
}

export interface IWildfireMerchantIntegration {
  merchantId: number;
  Name: string;
  domains: IWildfireDomain[];
  PaysNewCustomersOnly?: { type: Boolean };
  ShareAndEarnDisabled?: { type: Boolean };
  Categories?: IWildfireCategory[];
}

export interface IKardMerchantIntegration {
  id: string;
  name: string;
  source: MerchantSource;
  description: string;
  imgUrl: string;
  bannerImgUrl: string;
  websiteURL: string;
  acceptedCards: CardNetwork[];
  category: string;
  createdDate: string;
  lastModified?: string;
  maxOffer?: Partial<IKardOffer>;
}

export interface IKarmaMerchantIntegration {
  companyId: ObjectId;
}

export interface IMerchantIntegrations {
  wildfire?: IWildfireMerchantIntegration;
  kard?: IKardMerchantIntegration;
  karma?: IKarmaMerchantIntegration;
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
        domains: [
          {
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
          },
        ],
        Categories: [
          {
            ID: { type: Number },
            Name: { type: String },
            ParentId: { type: Number },
          },
        ],
      },
    },
    karma: {
      type: {
        companyId: { type: Schema.Types.ObjectId, ref: 'company' },
      },
    },
    kard: {
      type: {
        id: { type: String },
        name: { type: String },
        source: { type: String, enum: Object.values(MerchantSource) },
        description: { type: String },
        imgUrl: { type: String },
        bannerImgUrl: { type: String },
        websiteURL: { type: String },
        acceptdCards: [{ type: String, enum: Object.values(CardNetwork) }],
        category: { type: String },
        maxOffer: {
          id: { type: String },
          name: { type: String },
          merchantLocationIds: [{ type: String }],
          offerType: { type: String, enum: Object.values(OfferType) },
          source: { type: String, enum: Object.values(OfferSource) },
          commissionType: { type: String, enum: Object.values(CommissionType) },
          isLocationSpecific: { type: Boolean },
          optInRequired: { type: Boolean },
          terms: { type: String },
          startDate: { type: String },
          expirationDate: { type: String },
          createdDate: { type: String },
          totalCommission: { type: Number },
          minRewardAmount: { type: Number },
          maxRewardAmount: { type: Number },
          minTransactionAmount: { type: Number },
          maxTransactionAmount: { type: Number },
          redeemableOnce: { type: Boolean },
        },
        createdDate: { type: String },
        lastModified: { type: String },
      },
    },
  },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

export const MerchantModel = model<IMerchantDocument, PaginateModel<IMerchant>>('merchant', merchant);
