import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';
import { ICompanyDocument } from './company';
import { IUnsdgDocument } from './unsdg';

export interface ICompanyUnsdg {
  company: ICompanyDocument['_id'];
  unsdg: IUnsdgDocument['_id'];
  value: number;
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
  value: { type: Number },
  createdAt: { type: Date },
  lastModified: { type: Date },
});

export const CompanyUnsdgModel = model<ICompanyUnsdgDocument, Model<ICompanyUnsdg>>('company_unsdg', companyUnsdgSchema);
