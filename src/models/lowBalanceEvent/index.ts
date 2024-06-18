import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import { ILowBalanceEvent } from './types';

export interface ILowBalanceEventDocument extends ILowBalanceEvent, Document {}
export type ILowBalanceEventModel = IModel<ILowBalanceEvent>;

const lowBalanceEventSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  createdDate: { type: Date, required: true },
  lastEmailSent: { type: Date, required: true },
});

export const LowBalanceEventModel = model<ILowBalanceEventDocument, Model<ILowBalanceEvent>>('low_balance_event', lowBalanceEventSchema);
