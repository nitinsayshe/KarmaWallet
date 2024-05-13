import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import { IInvoice, IInvoiceDocument } from './types';
import { getUtcDate } from '../../lib/date';

export type IInvoiceModel = IModel<IInvoice>;

const InvoiceSchema = new Schema({
  amount: { type: Number, required: true },
  name: { type: String, required: true },
  createdOn: { type: Date, default: getUtcDate().toDate() },
  lastModified: { type: Date, default: getUtcDate().toDate() },
  // not sure what all we will have here just yet
  integrations: {
    stripe: {
      productId: { type: String, required: true },
    },
  },
});

export const InvoiceModel = model<IInvoiceDocument, Model<IInvoice>>('invoice', InvoiceSchema);
