import { Document, model, ObjectId, PaginateModel, Schema } from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export interface IShareableIncomingMerchants {
  _id: ObjectId;
  names: {company: string; merchant: string}[];
}

export interface IIncomingMerchant extends IShareableIncomingMerchants {
  dateAdded: Date;
  dateProcessed?: Date;
  dateScheduled?: Date;
  karmaCollectiveMember?: boolean;
  lastModified: Date;
  processed?: boolean;
}

export type IIncomingMerchantsModel = IModel<IIncomingMerchant>;

export interface IIncomingMerchantsDocument extends IIncomingMerchant, Document {
  _id: ObjectId;
}

const incomingMerchants = new Schema({
  dateAdded: { type: Date, default: () => getUtcDate() },
  dateProcessed: { type: Date },
  dateScheduled: { type: Date },
  karmaCollectiveMember: { type: Boolean },
  lastModified: { type: Date, default: () => getUtcDate() },
  names: [
    {
      type: {
        company: String,
        merchant: String,
      },
    },
  ],
  processed: { type: Boolean, default: false },
});

export const IncomingMerchantsModel = model<IIncomingMerchantsDocument, PaginateModel<IIncomingMerchant>>('incoming-merchants', incomingMerchants);
