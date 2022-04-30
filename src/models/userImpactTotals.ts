import {
  Schema,
  model,
  Model,
  Document,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IUserDocument } from './user';

export interface IUserImpactMonthData {
  date: Date;
  month: number;
  negative: number;
  neutral: number;
  positive: number;
  score: number;
  transactionCount: number;
  year: number;
}

export interface IUserImpactRating {
  min: number;
  max: number;
}

export interface IUserImpactRatings {
  negative: IUserImpactRating;
  neutral: IUserImpactRating;
  positive: IUserImpactRating;
}

export interface IUserImpactData {
  user: IRef<ObjectId, IUserDocument>;
  monthlyBreakdown: IUserImpactMonthData[];
  totalScore: number;
  totalTransactions: number;
  createdAt: Date;
  lastModified: Date;
}

export interface IUserImpactTotalDocument extends IUserImpactData, Document {}
export type IUserImpactTotalModel = IModel<IUserImpactData>;

const monthlyBreakDown = {
  date: { type: Date },
  month: { type: Number },
  negative: { type: Number },
  neutral: { type: Number },
  positive: { type: Number },
  score: { type: Number },
  transactionCount: { type: Number },
  year: { type: Number },
};

const userImpactTotalSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'user' },
  monthlyBreakDown,
  totalScore: { type: Number },
  totalTransactions: { type: Number },
  createdAt: { type: Date },
  lastModified: { type: Date },
});

export const UserImpactTotalModel = model<IUserImpactTotalDocument, Model<IUserImpactData>>('user_impact_total', userImpactTotalSchema);
