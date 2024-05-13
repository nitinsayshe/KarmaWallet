import { ObjectId, Document } from 'mongoose';
import { IRef } from '../../types/model';
import { IShareableUser } from '../user/types';
import { ISubscription } from '../subscription/types';

export enum InvoiceType {
  KarmaCardSubscription = 'KarmaCardSubscription',
}

export enum InvoiceStatus {
  billed = 'billed',
  paid = 'paid',
  unpaid = 'unpaid',
  cancelled = 'cancelled',
}

export interface IShareableInvoice {
  _id?: ObjectId;
  amount: number;
  dueDate: Date;
  status: InvoiceStatus;
  paymentLink: string;
  user?: IRef<ObjectId, IShareableUser>;
  subscription: IRef<ObjectId, ISubscription>;
  createdOn: Date;
  lastModified: Date;
  integrations?: {
    stripe?: {
      productId: string;
    }
  }
}

export interface IInvoice extends IShareableInvoice {}

export interface IInvoiceDocument extends IInvoice, Document {
  _id: ObjectId;
}
