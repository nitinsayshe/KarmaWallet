import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import { IInvoice, IInvoiceDocument, InvoiceStatus } from './types';
import { getUtcDate } from '../../lib/date';

export type IInvoiceModel = IModel<IInvoice>;

const InvoiceSchema = new Schema({
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true, default: getUtcDate().toDate() },
  status: { type: String, enum: Object.values(InvoiceStatus) },
  invoiceLink: { type: String },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  createdOn: { type: Date, default: getUtcDate().toDate() },
  lastModified: { type: Date, default: getUtcDate().toDate() },
  // not sure what all we will have here just yet
  integrations: {
    stripe: {
      type: Object,
    },
  },
});

export const InvoiceModel = model<IInvoiceDocument, Model<IInvoice>>('invoice', InvoiceSchema);
