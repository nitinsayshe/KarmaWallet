import {
  Document, model, ObjectId, Schema,
} from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
import mongoosePaginate from 'mongoose-paginate-v2';
import { CompanyRating } from '../lib/constants/company';
import { slugify } from '../lib/slugify';
import { IAggregatePaginateModel } from '../sockets/types/aggregations';
import { IModel, IRef } from '../types/model';
import { IShareableMerchant } from './merchant';
import { ISector, ISectorDocument } from './sector';
import { IUnsdg, IUnsdgDocument } from './unsdg';
import { IUnsdgCategory, IUnsdgCategoryDocument } from './unsdgCategory';
import { IUnsdgSubcategory, IUnsdgSubcategoryDocument } from './unsdgSubcategory';

export enum CashbackCompanyDisplayLocation {
  'homeMobile' = 'homeMobile',
  'homeWeb' = 'homeWeb',
  'browseCompanies' = 'browseCompanies',
  'cashbackScreenMobile' = 'cashbackScreenMobile',
}

export interface IFeaturedCashbackCompany {
  status: boolean;
  location: CashbackCompanyDisplayLocation[];
}

export enum CompanyCreationStatus {
  Completed = 'completed',
  PendingDataSources = 'pending-data-sources',
  PendingScoreCalculations = 'pending-score-calculations',
}

export enum CompanyHideReasons {
  Manual = 'manual',
  NoDataSources = 'no-data-sources',
  None = 'none',
  InvalidReason = 'invalid-reason',
  NoPrimaryDataSource = 'no-primary-data-source',
  WholeSectorIsHidden = 'whole-sector-is-hidden',
  NoWorkingWebsite = 'no-working-website',
}

export interface ICompanyPartnerStatus {
  active: boolean;
  description: string;
}

export interface IHiddenCompany {
  status: boolean;
  reason: CompanyHideReasons;
  lastModified: Date;
}

export interface ICategoryScore {
  category: IRef<ObjectId, (IUnsdgCategory | IUnsdgCategoryDocument)>;
  score: number;
}

export interface ISubcategoryScore {
  subcategory: IRef<ObjectId, (IUnsdgSubcategory | IUnsdgSubcategoryDocument)>;
  score: number;
}

export interface ICompanySector {
  sector: IRef<ObjectId, ISector | ISectorDocument>;
  primary: boolean;
}

export interface ICompanyHidden {
  status: boolean;
  reason: string;
  lastModified: Date;
}

export interface IWildfireCompanyIntegration {
  merchantId?: string;
}

export interface ICompanyIntegrations {
  wildfire?: IWildfireCompanyIntegration;
}

export interface IEvaluatedCompanyUnsdg {
  unsdg: IRef<ObjectId, IUnsdg | IUnsdgDocument>;
  evaluated: boolean;
  score: number;
}

export interface IShareableCompany {
  _id: ObjectId;
  combinedScore: number;
  categoryScores: ICategoryScore[];
  subcategoryScores: ISubcategoryScore[];
  companyName: string;
  dataYear: number;
  grade: string;
  hidden: ICompanyHidden;
  isBrand: boolean;
  logo: string;
  // eslint-disable-next-line no-use-before-define
  parentCompany: IRef<ObjectId, IShareableCompany>;
  merchant: IRef<ObjectId, IShareableMerchant>;
  rating: CompanyRating;
  sectors: ICompanySector[];
  slug: string;
  url: string;
  createdAt: Date;
  lastModified: Date;
  evaluatedUnsdgs: IEvaluatedCompanyUnsdg[];
  partnerStatus: ICompanyPartnerStatus;
  featuredCashback?: IFeaturedCashbackCompany;
}

export interface ICompany extends IShareableCompany {
  hidden: IHiddenCompany;
  legacyId: number;
  // eslint-disable-next-line no-use-before-define
  parentCompany: IRef<ObjectId, ICompanyDocument>;
  notes: string;
  mcc: number;
}

export interface ICompanyDocument extends ICompany, Document {
  _id: ObjectId;
}

export type ICompanyModel = IModel<ICompany>;

const companySchema = new Schema(
  {
    companyName: { type: String, required: true },
    // TODO: update this field whenver unsdgs are updated.
    // too expensive to make virtual
    combinedScore: { type: Number },
    mcc: { type: Number },
    rating: {
      type: String,
      enum: Object.values(CompanyRating),
    },
    categoryScores: [{
      type: {
        category: {
          type: Schema.Types.ObjectId,
          ref: 'unsdg_category',
        },
        score: { type: Number },
      },
    }],
    subcategoryScores: [{
      type: {
        subcategory: {
          type: Schema.Types.ObjectId,
          ref: 'unsdg_subcategory',
        },
        score: { type: Number },
      },
    }],
    sectors: [{
      type: {
        sector: {
          type: Schema.Types.ObjectId,
          ref: 'sector',
        },
        primary: {
          type: Boolean,
          default: false,
        },
      },
    }],
    url: { type: String, default: null },
    // TODO: update this field whenever usdgs are updated
    // too expensive to make virtual
    grade: { type: String, default: null },
    parentCompany: {
      type: Schema.Types.ObjectId,
      ref: 'company',
    },
    logo: { type: String },
    relevanceScore: { type: Number, default: null },
    legacyId: { type: Number },
    notes: {
      type: String,
    },
    hidden: {
      type: {
        status: { type: Boolean },
        reason: {
          type: String,
          enum: Object.values(CompanyHideReasons),
        },
        lastModified: { type: Date },
      },
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    },
    lastModified: { type: Date },
    merchant: {
      type: Schema.Types.ObjectId,
      ref: 'merchant',
    },
    evaluatedUnsdgs: [{
      type: {
        unsdg: {
          type: Schema.Types.ObjectId,
          ref: 'unsdg',
        },
        evaluated: {
          type: Boolean,
        },
        score: {
          type: Number,
        },
      },
    }],
    partnerStatus: {
      active: {
        type: Boolean,
        default: false,
      },
      description: {
        type: String,
      },
    },
    featuredCashback: {
      status: { type: Boolean },
      location: { type: [String], enum: CashbackCompanyDisplayLocation },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

companySchema.plugin(mongoosePaginate);
companySchema.plugin(mongooseAggregatePaginate);

// eslint-disable-next-line func-names
companySchema.virtual('slug').get(function (this: ICompanyDocument) {
  return slugify(this.companyName);
});

export const CompanyModel = model<ICompanyDocument, IAggregatePaginateModel<ICompanyDocument>>('company', companySchema);
