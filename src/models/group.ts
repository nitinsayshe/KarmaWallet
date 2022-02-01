import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface IGroup {
  name: string;
  code: string;
}

export interface IGroupDocument extends IGroup, Document {}
export type IGroupModel = IModel<IGroup>;

const groupSchema = new Schema({
  name: { type: String },
  code: { type: String },
});

export const GroupModel = model<IGroupDocument, Model<IGroup>>('group', groupSchema);
