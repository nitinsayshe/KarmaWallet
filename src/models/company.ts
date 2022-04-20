import {
  Schema,
  model,
  Document,
  PaginateModel,
  ObjectId,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel, IRef } from '../types/model';
import { IDataSource, IDataSourceDocument } from './dataSource';
import { ISector, ISectorDocument } from './sector';
import { slugify } from '../lib/slugify';

export interface IHiddenCompany {
  status: boolean;
  reason: string;
  lastModified: Date;
}

export interface ICompanySector {
  sector: IRef<ObjectId, ISector | ISectorDocument>;
  primary: boolean;
}

export interface IShareableCompany {
  _id: ObjectId;
  combinedScore: number;
  companyName: string;
  dataSources: IRef<ObjectId, IDataSource>[];
  dataYear: number;
  grade: string;
  isBrand: boolean;
  logo: string;
  // eslint-disable-next-line no-use-before-define
  parentCompany: IRef<ObjectId, IShareableCompany>;
  sectors: ICompanySector[];
  slug: string;
  url: string;
  lastModified: Date;
}

export interface ICompany extends IShareableCompany {
  dataSources: IRef<ObjectId, IDataSourceDocument>[];
  hidden: IHiddenCompany;
  legacyId: number;
  // eslint-disable-next-line no-use-before-define
  parentCompany: IRef<ObjectId, ICompanyDocument>;
  notes: string;
}

export interface ICompanyDocument extends ICompany, Document {
  _id: ObjectId;
}
export type ICompanyModel = IModel<ICompany>;

const companySchema = new Schema(
  {
    companyName: { type: String, required: true },
    dataSources: [{
      type: Schema.Types.ObjectId,
      ref: 'data_source',
    }],
    // TODO: update this field whenver unsdgs are updated.
    // too expensive to make virtual
    combinedScore: { type: Number },
    dataYear: { type: Number }, // ??? do want to track this on the company?
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
    legacyId: {
      type: Number,
      required: true,
      unique: true,
    },
    notes: {
      type: String,
    },
    hidden: {
      type: {
        status: Boolean,
        reason: String,
        lastModified: Date,
      },
      required: true,
    },
    lastModified: { type: Date },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
companySchema.plugin(mongoosePaginate);

// eslint-disable-next-line func-names
companySchema.virtual('slug').get(function (this: ICompanyDocument) {
  return slugify(this.companyName);
});

export const CompanyModel = model<ICompanyDocument, PaginateModel<ICompany>>('company', companySchema);
