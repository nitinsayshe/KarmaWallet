import {
  Schema,
  ObjectId,
  model,
  Document,
  PaginateModel,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel, IRef } from '../types/model';
import { IGroupDocument, IShareableGroup } from './group';
import { IShareableTransaction, ITransactionDocument } from './transaction';
import { IShareableUser, IUserDocument } from './user';

export interface IOffsetData {
  dollars: number;
  tonnes: number;
}

export interface IMatchedOffsetData extends IOffsetData {
  date: Date;
}

export interface IOffsetsStatement {
  matched: IMatchedOffsetData;
  toBeMatched: IOffsetData;
  totalMemberOffsets: IOffsetData;
}

export interface IShareableStatement {
  group: IRef<ObjectId, IShareableGroup>;
  transactor?: IRef<ObjectId, IShareableUser>;
  offsets: IOffsetsStatement;
  transactions: IRef<ObjectId, IShareableTransaction>;
  date: Date;
}

export interface IStatement extends IShareableStatement {
  group: IRef<ObjectId, IGroupDocument>;
  transactor?: IRef<ObjectId, IUserDocument>;
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
      matched: {
        type: {
          dollars: { type: Number },
          tonnes: { type: Number },
          transactor: {
            // specifying user here because eventually we will support group transactors
            user: {
              type: Schema.Types.ObjectId,
              ref: 'user',
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
  date: {
    type: Date,
    default: new Date(),
  },
});
statementSchema.plugin(mongoosePaginate);

export const StatementModel = model<IStatementDocument, PaginateModel<IStatement>>('statement', statementSchema);
