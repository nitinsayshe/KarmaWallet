import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { IACHTransfer, IACHTransferTypes, IACHTransferStatuses, IACHTransferDocument } from './types';

const ACHTransferSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  token: { type: String },
  amount: { type: Number },
  channel: { type: String },
  funding_source_token: { type: String },
  type: { type: String, enum: Object.values(IACHTransferTypes) },
  currency_code: { type: String },
  transfer_speed: { type: String },
  status: { type: String, enum: Object.values(IACHTransferStatuses) },
  bank: {
    name: { type: String },
    subtype: { type: String },
    type: { type: String },
    institution: { type: String },
    mask: { type: String },
  },
  transitions: [
    {
      token: { type: String },
      bank_transfer_token: { type: String },
      status: { type: String, enum: Object.values(IACHTransferStatuses) },
      transaction_token: { type: String },
      created_time: { type: Date },
      last_modified_time: { type: Date },
    },
  ],
  created_time: { type: Date },
  last_modified_time: { type: Date },
});

export const ACHTransferModel = model<IACHTransferDocument, Model<IACHTransfer>>('ach_transfer', ACHTransferSchema);
