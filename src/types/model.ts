import {
  Document,
  Types,
} from 'mongoose';

export type IModel<T> = Document<unknown, any, T> & T & { _id: Types.ObjectId; };
