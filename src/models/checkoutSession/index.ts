import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { getUtcDate } from '../../lib/date';
import { ICheckoutSession, ICheckoutSessionDocument, ICheckoutSessionPaymentStatus, ICheckoutSessionStatus } from './types';

const CheckoutSession = new Schema({
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  user: { type: Schema.Types.ObjectId, ref: 'user' },
  status: { type: String, enum: Object.values(ICheckoutSessionStatus) },
  paymentStatus: { type: String, enum: Object.values(ICheckoutSessionPaymentStatus) },
  expired: { type: Date },
  url: { type: String },
});

export const CheckoutSessionModel = model<ICheckoutSessionDocument, Model<ICheckoutSession>>('checkout_session', CheckoutSession);
