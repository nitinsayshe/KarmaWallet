import { Schema, model, Document, ObjectId, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { v4 as uuid } from 'uuid';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export interface IClient {
  publicId: string;
  name: string;
  createdOn: Date;
  lastModified: Date;
  deletedOn?: Date;
}

export type IClientModel = IModel<IClient>;

export interface IClientDocument extends IClient, Document {
  _id: ObjectId;
}

const clientSchema = new Schema({
  publicId: { type: String, default: () => uuid().toString() },
  name: { type: String, required: true },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
  deletedOn: { type: Date },
});

clientSchema.plugin(mongoosePaginate);

export const ClientModel = model<IClientDocument, PaginateModel<IClient>>(
  'client',
  clientSchema,
);
