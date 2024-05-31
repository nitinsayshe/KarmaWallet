import {
  Document,
  ObjectId,
} from 'mongoose';
import { IModel } from '../../types/model';

export enum ICheckoutSessionPaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  NO_PAYMENT_REQUIRED = 'no_payment_required',
}

export enum ICheckoutSessionStatus {
  EXPIRED = 'expired',
  COMPLETE = 'complete',
  OPEN = 'open',
}

export interface ICheckoutSession {
  _id: ObjectId;
  paymentStatus: ICheckoutSessionPaymentStatus;
  status: ICheckoutSessionStatus;
  url: string;
  expires: Date;
  createdOn: Date;
  user: ObjectId;
}

export interface ICheckoutSessionDocument extends ICheckoutSession, Document {
  _id: ObjectId;
}

export type ICheckoutSessionModel = IModel<ICheckoutSession>;
