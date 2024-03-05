import { Schema, model, Document, Model, ObjectId } from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { IShareableUser } from './user/types';

export interface IKarmaCardStatementTransactionTotals {
  debits: number;
  credits: number;
  adjustments: number;
  cashback: number;
  deposits: number;
  startBalance: number;
  endBalance: number;
}

export interface IShareableKarmaCardStatement {
  _id: ObjectId;
  beginningBalance: number;
  endDate: Date;
  transactionTotals: IKarmaCardStatementTransactionTotals;
  pdf: string;
  startDate: Date;
  transactions: ObjectId[];
  userId: IRef<ObjectId, IShareableUser>;
}

export interface IKarmaCardStatement extends IShareableKarmaCardStatement {
  _id: ObjectId;
}

export interface IKarmaCardStatementDocument extends IKarmaCardStatement, Document {
  _id: ObjectId;
}

export type IKarmaCardStatementModel = IModel<IKarmaCardStatement>;

const karmaCardStatement = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  transactions: [{
    type: Schema.Types.ObjectId,
    ref: 'transaction',
  }],
  startDate: { type: Date },
  endDate: { type: Date },
  transactionTotals: { type: Object },
  createdOn: { type: Date, default: () => getUtcDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
  pdf: { type: String },
});

export const KarmaCardStatementModel = model<IKarmaCardStatementDocument, Model<IKarmaCardStatementModel>>('karmaCardStatement', karmaCardStatement);
