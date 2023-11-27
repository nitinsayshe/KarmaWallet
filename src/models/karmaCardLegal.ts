import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export interface IKarmaCardLegal {
  _id: ObjectId;
  createdOn: Date;
  lastModified: Date;
  name: string;
  text: string;
}

export interface IKarmaCardLegalDocument extends IKarmaCardLegal, Document {
  _id: ObjectId;
}

export type IKarmaCardLegalModel = IModel<IKarmaCardLegal>;

const karmaCardLegalSchema = new Schema({
  createdOn: { type: Date, required: true, default: () => getUtcDate() },
  lastModified: { type: Date, required: true, default: () => getUtcDate() },
  text: { type: String, required: true },
  name: { type: String, required: true },
});

export const KarmaCardLegalModel = model<IKarmaCardLegalDocument, Model<IKarmaCardLegal>>('karma_card_legal', karmaCardLegalSchema);
