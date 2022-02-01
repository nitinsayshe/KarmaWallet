import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface IUnmatchedCompanyName {
  original: string;
  count: number;
  createdOn: Date;
  lastModified: Date;
}

export interface IUnmatchedCompanyNameDocument extends IUnmatchedCompanyName, Document {}
export type IUnmatchedCompanyNameModel = IModel<IUnmatchedCompanyName>;

const unmatchedCompanyNameSchema = new Schema({
  original: { type: String },
  count: { type: Number },
  createdOn: { type: Date },
  lastModified: { type: Date },
});

export const UnmatchedCompanyNameModel = model<IUnmatchedCompanyNameDocument, Model<IUnmatchedCompanyName>>('unmatched_company_names', unmatchedCompanyNameSchema);
