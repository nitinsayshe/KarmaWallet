import {
  Schema,
  ObjectId,
  model,
  Document,
  PaginateModel,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel, IRef } from '../types/model';
import { IShareableTransaction, ITransactionDocument } from './transaction';

export interface IOffsetData {
  dollars: number;
  tonnes: number;
}

export interface IMatchedOffsetData extends IOffsetData {
  date: Date;
}

export interface IToBeMatchedTransaction {
  value: number;
  transaction: IRef<ObjectId, ITransactionDocument>;
}
export interface IToBeMatchedData extends IOffsetData {
  transactions?: IToBeMatchedTransaction[];
}

export interface IOffsetsStatement {
  matchPercentage: number,
  maxDollarAmount: number,
  matched?: IMatchedOffsetData;
  toBeMatched: IToBeMatchedData;
  totalMemberOffsets: IOffsetData;
}

export interface IShareableStatementRef {
  offsets?: IOffsetsStatement;
  date: Date;
}

export interface IShareableStatement extends IShareableStatementRef {
  transactions: IRef<ObjectId, IShareableTransaction>;
}

export interface IStatement extends IShareableStatement {
  transactions: IRef<ObjectId, ITransactionDocument>;
}

export interface IStatementDocument extends IStatement, Document {}
export type IStatementModel = IModel<IStatement>;

const statementSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: 'group',
  },
  offsets: {
    type: {
      matchPercentage: { type: Number },
      maxDollarAmount: { type: Number },
      matched: {
        type: {
          dollars: { type: Number },
          tonnes: { type: Number },
          transactor: {
            user: {
              type: Schema.Types.ObjectId,
              ref: 'user',
            },
            group: {
              type: Schema.Types.ObjectId,
              ref: 'group',
            },
          },
          date: { type: Date },
        },
      },
      toBeMatched: {
        type: {
          dollars: { type: Number },
          tonnes: { type: Number },
          // breakdown of each transaction to be matched
          // and how much of it is to be matched (accounts
          // for partial matches)
          transactions: {
            type: [{
              value: Number,
              transaction: {
                type: Schema.Types.ObjectId,
                ref: 'transaction',
              },
            }],
          },
        },
      },
      totalMemberOffsets: {
        type: {
          dollars: { type: Number },
          tonnes: { type: Number },
        },
      },
    },
  },
  transactions: [{
    type: Schema.Types.ObjectId,
    ref: 'transaction',
  }],
  // the date this statement is for
  date: {
    type: Date,
    default: new Date(),
  },
  // the date this statement was generated
  // will usually be the 1st day of the month
  // after `date`
  createdOn: { type: Date },
});
statementSchema.plugin(mongoosePaginate);

export const StatementModel = model<IStatementDocument, PaginateModel<IStatement>>('statement', statementSchema);
