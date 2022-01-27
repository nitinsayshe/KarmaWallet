import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../../types/model';
import schemaDefinition from '../schema/group';

export interface IGroup {
  name: string;
  code: string;
}

export interface IGroupDocument extends IGroup, Document {}
export type IGroupModel = IModel<IGroup>;

export const GroupModel = model<IGroupDocument, Model<IGroup>>('group', new Schema(schemaDefinition));
