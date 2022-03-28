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
  group: {
    type: Schema.Types.ObjectId,
    ref: 'group',
  },
  transactor: {
    // specifying user here because eventually we will support group transactors
    user: {
      type: Schema.Types.ObjectId,
      ref: 'user',
    },
  },
  offsets: {
    type: {
      matched: {
        type: {
          date: { type: Date },
          dollars: { type: Number },
          tonnes: { type: Number },
        },
      },
      toBeMatched: {
        type: {
          dollars: { type: Number },
          tonnes: { type: Number },
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
