import { ObjectId,
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { ICompanyDocument } from './company';
import { IDataSourceDocument } from './dataSource';
import { IUnsdgDocument } from './unsdg';

export interface ICompanyUnsdgAllValue {
  value: number;
  dataSource: IRef<ObjectId, IDataSourceDocument>;
}

export interface ICompanyUnsdg {
  company: IRef<ObjectId, ICompanyDocument>;
  unsdg: IRef<ObjectId, IUnsdgDocument>;
  value: number;
  allValues?: ICompanyUnsdgAllValue[];
  createdAt: Date;
  lastModified: Date;
}

export interface ICompanyUnsdgDocument extends ICompanyUnsdg, Document {}
export type ICompanyUnsdgModel = IModel<ICompanyUnsdg>;

const companyUnsdgSchema = new Schema({
  company: {
    type: Schema.Types.ObjectId,
    ref: 'company',
    required: true,
  },
  unsdg: {
    type: Schema.Types.ObjectId,
    ref: 'unsdg',
    require: true,
  },
  // value < 0 = negative
  // value = 0 = no data
  // value > 0 = positive
  value: { type: Number },
  allValues: [{
    type: {
      value: { type: Number },
      dataSource: {
        type: Schema.Types.ObjectId,
        ref: 'data_source',
      },
    },
  }],
  createdAt: { type: Date },
  lastModified: { type: Date },
});

export const CompanyUnsdgModel = model<ICompanyUnsdgDocument, Model<ICompanyUnsdg>>('company_unsdg', companyUnsdgSchema);
