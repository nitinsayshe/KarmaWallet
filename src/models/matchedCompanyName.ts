import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface IMatchedCompanyNames {
  original: string;
  companyName: string;
  companyId: string;
  verified: boolean;
  falsePositive: boolean;
  manualMatch: boolean;
  createdOn: Date;
  lastModified: Date;
}

export interface IMatchedCompanyNameDocument extends IMatchedCompanyNames, Document {}
export type IMatchedCompanyNameModel = IModel<IMatchedCompanyNames>;

const matchedCompanyNameSchema = new Schema({
  original: { type: String },
  companyName: { type: String },
  companyId: {
    type: String,
    ref: 'company',
  },
  verified: {
    type: Boolean,
    default: false,
  },
  falsePositive: {
    type: Boolean,
    default: false,
  },
  manualMatch: {
    type: Boolean,
    default: false,
  },
  createdOn: { type: Date },
  lastModified: { type: Date },
});

export const MatchedCompanyNameModel = model<IMatchedCompanyNameDocument, Model<IMatchedCompanyNames>>('matched_company_names', matchedCompanyNameSchema);
