import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import schemaDefinition from '../schema/group';

export interface IGroup {
  name: string;
  code: string;
}

export interface IGroupDocument extends IGroup, Document {}
export interface IGroupModel extends Model<IGroup> {}

export const GroupModel = model<IGroupDocument, IGroupModel>('group', new Schema(schemaDefinition));
