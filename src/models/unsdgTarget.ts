import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';
import { IUnsdgDocument } from './unsdg';

export interface IUnsdgTarget {
  unsdg: IUnsdgDocument['_id'];
  title: string;
  description: string;
  order: number;
}

export interface IUnsdgTargetDocument extends IUnsdgTarget, Document {}
export type IUnsdgTargetModel = IModel<IUnsdgTarget>;

const unsdgTargetSchema = new Schema({
  unsdg: {
    type: Schema.Types.ObjectId,
    ref: 'unsdg',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  order: {
    type: Number,
  },
});

export const UnsdgTargetModel = model<IUnsdgTargetDocument, Model<IUnsdgTarget>>('unsdg_target', unsdgTargetSchema);
