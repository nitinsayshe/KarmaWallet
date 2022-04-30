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
  negative: number;
  neutral: number;
  positive: number;
  score: number;
  transactionCount: number;
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

export interface IUserImpactSummaryScore {
  score: number;
  amount: number;
}

export interface IUserImpactSummary {
  scores: IUserImpactSummaryScore[];
  total: number;
}

export interface IUserImpactTotalScores {
  score: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface IUserImpactData {
  user: IRef<ObjectId, IUserDocument>;
  summary: IUserImpactSummary;
  totalScores: IUserImpactTotalScores;
  monthlyBreakdown: IUserImpactMonthData[];
  totalTransactions: number;
  createdAt: Date;
  lastModified: Date;
}

export interface IUserImpactTotalDocument extends IUserImpactData, Document {}
export type IUserImpactTotalModel = IModel<IUserImpactData>;

const userImpactTotalSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'user' },
  summary: {
    type: {
      scores: [{
        type: {
          score: { type: Number },
          amount: { type: Number },
        },
      }],
      total: { type: Number },
    },
  },
  totalScores: {
    type: {
      score: { type: Number },
      positive: { type: Number },
      neutral: { type: Number },
      negative: { type: Number },
    },
  },
  monthlyBreakdown: {
    type: [{
      date: { type: Date },
      negative: { type: Number },
      neutral: { type: Number },
      positive: { type: Number },
      score: { type: Number },
      transactionCount: { type: Number },
    }],
  },
  totalTransactions: { type: Number },
  createdAt: { type: Date },
  lastModified: { type: Date },
});

export const UserImpactTotalModel = model<IUserImpactTotalDocument, Model<IUserImpactData>>('user_impact_total', userImpactTotalSchema);
