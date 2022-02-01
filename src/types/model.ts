import {
  Document,
  Types,
} from 'mongoose';

export type IModel<T> = Document<unknown, any, T> & T & { _id: Types.ObjectId; };

/**
 * use this in model interfaces where the property
 * is a reference to another resource, since this
 * property could be an id of that resource, an
 * array of ids, or it can be the full populated
 * resource (or an array of them)
 */
export type IRef<T, U> = T | T[] | U | U[];
