import { ObjectId, Document } from 'mongoose';
import Stripe from 'stripe';
import { IRef } from '../../types/model';
import { IShareableUser } from '../user/types';

export enum InvoiceType {
  KarmaCardSubscription = 'KarmaCardSubscription',
}

export enum InvoiceStatus {
  paid = 'paid',
  open = 'open',
  void = 'void',
  draft = 'draft',
  uncollectible = 'uncollectible',
}

export interface IShareableInvoice {
  _id?: ObjectId;
  amount: number;
  dueDate: Date;
  status: InvoiceStatus;
  invoiceLink: string;
  user?: IRef<ObjectId, IShareableUser>;
  createdOn: Date;
  lastModified: Date;
  integrations?: {
    stripe?: Stripe.Invoice;
  }
}

export interface IInvoice extends IShareableInvoice {}

export interface IInvoiceDocument extends IInvoice, Document {
  _id: ObjectId;
}
