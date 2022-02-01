import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';
import { ICompanyDocument } from './company';
import { IDataSourceDocument } from './dataSource';

interface IDateRange {
  start: Date;
  end: Date;
}

export interface ICompanyDataSource {
  company: ICompanyDocument['_id'];
  sourceId: IDataSourceDocument['_id'];
  url: string;
  /**
   * the date awarded this source
   * and the date that award expires
   */
  dateRange: IDateRange;
  isPrimary: boolean;
}

export interface ICompanyDataSourceDocument extends ICompanyDataSource, Document {}
export type ICompanyDataSourceModel = IModel<ICompanyDataSource>;

const companyDataSourceSchema = new Schema({
  company: {
    type: Schema.Types.ObjectId,
    ref: 'company',
    required: true,
  },
  source: {
    type: Schema.Types.ObjectId,
    ref: 'data_source',
    required: true,
  },
  url: {
    type: String,
  },
  dateRange: {
    type: {
      start: { type: Date },
      end: { type: Date },
    },
  },
  isPrimary: {
    type: Boolean,
  },
});

export const CompanyDataSourceModel = model<ICompanyDataSourceDocument, Model<ICompanyDataSource>>('company_data_source', companyDataSourceSchema);
