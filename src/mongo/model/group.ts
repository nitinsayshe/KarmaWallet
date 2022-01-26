import {
  Schema,
  model,
  Document,
} from 'mongoose';
import schemaDefinition from '../schema/group';

export interface IGroup {
  name: string;
  code: string;
}

export interface IGroupModel extends IGroup, Document {}

export const GroupModel = model<IGroupModel>('group', new Schema(schemaDefinition));
