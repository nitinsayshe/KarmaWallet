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
  parentCompany: IRef<number, IShareableCompany>;
  sectors: IRef<ObjectId, ISector>[];
  slug: string;
  url: string;
}

export interface ICompany extends IShareableCompany {
  dataSources: IRef<ObjectId, IDataSourceDocument>[];
  legacyId: number;
  // eslint-disable-next-line no-use-before-define
  parentCompany: IRef<number, ICompanyDocument>;
  sectors: IRef<ObjectId, ISectorDocument>[];
}

export interface ICompanyDocument extends ICompany, Document {
  _id: ObjectId;
}
export type ICompanyModel = IModel<ICompany>;

const companySchema = new Schema({
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
    type: Schema.Types.ObjectId,
    ref: 'sector',
  }],
  slug: { type: String }, // TODO: update to virtual
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
});
companySchema.plugin(mongoosePaginate);

export const CompanyModel = model<ICompanyDocument, PaginateModel<ICompany>>('company', companySchema);
