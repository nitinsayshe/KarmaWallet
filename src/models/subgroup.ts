import {
  ObjectId,
  Schema,
  model,
  PaginateModel,
  Document,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel, IRef } from '../types/model';
import { IGroup } from './group';

export interface ISubgroup {
  group: IRef<ObjectId, IGroup>;
  name: string;
}

export interface ISubgroupDocument extends ISubgroup, Document {}
export type ISubgroupModel = IModel<ISubgroup>;

const subgroupSchema = new Schema({
  group: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});
subgroupSchema.plugin(mongoosePaginate);

export const SubgroupModel = model<ISubgroupDocument, PaginateModel<ISubgroup>>('subgroup', subgroupSchema);
