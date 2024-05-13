import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export const ServerSourcesEnum = {
  Persona: 'persona',
} as const;
export type ServerSourcesEnumValue = typeof ServerSourcesEnum[keyof typeof ServerSourcesEnum];

export const ServerTypesEnum = {
  Whitelist: 'whitelist',
} as const;
export type ServerTypesEnumValue = typeof ServerTypesEnum[keyof typeof ServerTypesEnum];

export interface IServer {
  ip: string;
  domain?: string;
  source: ServerSourcesEnumValue;
  type?: ServerTypesEnumValue;
  createdOn: Date;
  lastUpdatedOn: Date;
}

export interface IServerDocument extends IServer, Document { }
export type IServerModel = IModel<IServer>;

const serverSchema = new Schema({
  ip: { type: String },
  source: { type: String, enum: Object.values(ServerSourcesEnum) },
  type: { type: String, enum: Object.values(ServerTypesEnum) },
  createdOn: { type: Date, default: () => getUtcDate() },
  lastUpdatedOn: { type: Date, default: () => getUtcDate() },
});

export const ServerModel = model<IServerDocument, Model<IServer>>('server', serverSchema);
