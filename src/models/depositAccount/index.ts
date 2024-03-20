import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import { IDepositAccount, IDepositAccountState, IDepositAccountDocument } from './types';
import { DepositAccountTypes } from '../../integrations/marqeta/types';

export type IDepositAccountModel = IModel<IDepositAccount>;

const DepositAccountSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  routingNumber: { type: String },
  accountNumber: { type: String },
  state: { type: String, enum: Object.values(IDepositAccountState) },
  integrations: {
    marqeta: {
      token: { type: String },
      user_token: { type: String },
      allow_immediate_credit: { type: Boolean },
      state: {
        type: String,
        enum: Object.values(IDepositAccountState),
      },
      created_time: { type: Date },
      last_modified_time: { type: Date },
      type: {
        type: String,
        enum: Object.values(DepositAccountTypes),
      },
    },
  },
  createdTime: { type: Date },
  lastModified: { type: Date },
});

export const DepositAccountModel = model<IDepositAccountDocument, Model<IDepositAccount>>('deposit_account', DepositAccountSchema);
