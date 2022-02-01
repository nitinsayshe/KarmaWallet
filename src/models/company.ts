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

export interface ISharableCompany {
  _id: number;
  combinedScore: number;
  companyName: string;
  dataSources: IRef<ObjectId, IDataSource>[];
  dataYear: number;
  grade: string;
  isBrand: boolean;
  // eslint-disable-next-line no-use-before-define
  parentCompany: IRef<number, ISharableCompany>;
  sectors: IRef<ObjectId, ISector>[];
  slug: string;
  url: string;
}

export interface ICompany extends ISharableCompany {
  companyId: number; // ??? will this be the legacy karma id? do we need this?
  dataSources: IRef<ObjectId, IDataSourceDocument>[];
  // eslint-disable-next-line no-use-before-define
  parentCompany: IRef<number, ICompanyDocument>;
  sectors: IRef<ObjectId, ISectorDocument>[];
}

export interface ICompanyDocument extends ICompany, Document {
  _id: number;
}
export type ICompanyModel = IModel<ICompany>;

const companySchema = new Schema({
  _id: { type: Number, required: true }, // TODO: update this to ObjectId?
  companyId: { type: Number, required: true }, // ??? will this be the legacy karma id? do we need this?
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
});
companySchema.plugin(mongoosePaginate);

export const CompanyModel = model<ICompanyDocument, PaginateModel<ICompany>>('company', companySchema);
