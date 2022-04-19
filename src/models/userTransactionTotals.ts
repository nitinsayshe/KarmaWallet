import {
  Schema,
  model,
  Model,
  Document,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { ICompanyDocument } from './company';
import { ISectorDocument } from './sector';
import { IUserDocument } from './user';

export interface ITransactionTotals {
  totalSpent: number;
  transactionCount: number;
}

export interface ICompanyTransactionTotals extends ITransactionTotals {
  company: IRef<ObjectId, ICompanyDocument>;
}

export interface ISectorTransactionTotals extends ITransactionTotals {
  sector: IRef<ObjectId, ISectorDocument>;
  tier: number;
  companies: IRef<ObjectId, ICompanyDocument>[];
}

export interface IUserTransactionTotal {
  user: IRef<ObjectId, IUserDocument>;
  groupedByCompany: ICompanyTransactionTotals[];
  groupedBySector: ISectorTransactionTotals[];
  totalSpent: number;
  totalTransactionCount: number;
  createdAt: Date;
  lastModified: Date;
}

export interface IUserTransactionTotalDocument extends IUserTransactionTotal, Document {}
export type IUserTransactionTotalModel = IModel<IUserTransactionTotal>;

const CompanyDataSchema = new Schema({
  company: {
    type: Schema.Types.ObjectId,
    ref: 'company',
  },
  totalSpent: { type: Number },
  transactionCount: { type: Number },
});

const SectorDataSchema = new Schema({
  sector: {
    type: Schema.Types.ObjectId,
    ref: 'sector',
  },
  tier: { type: Number },
  totalSpent: { type: Number },
  transactionCount: { type: Number },
  companies: {
    type: [Schema.Types.ObjectId],
    ref: 'company',
  },
});

const userTransactionTotalSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'user' },
  groupedByCompany: { type: [CompanyDataSchema], default: [] },
  groupedBySector: { type: [SectorDataSchema], default: [] },
  totalSpent: { type: Number },
  totalTransactionCount: { type: Number },
  createdAt: { type: Date },
  lastModified: { type: Date },
});

export const UserTransactionTotalModel = model<IUserTransactionTotalDocument, Model<IUserTransactionTotal>>('user_transaction_total', userTransactionTotalSchema);
