import { ObjectId, Document } from 'mongoose';

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
  user?: ObjectId;
  karmaCardSubscription: ObjectId;
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
