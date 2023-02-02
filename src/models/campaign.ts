import {
  Schema,
  model,
  Document,
  ObjectId,
  PaginateModel,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export interface ICampaign {
  name: string;
  description?: string;
  lastModified: Date;
  createdOn: Date;
}

export type ICampaignModel = IModel<ICampaign>;
export interface ICampaignDocument extends ICampaign, Document {
  _id: ObjectId;
}

const campaignSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: false },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

campaignSchema.plugin(mongoosePaginate);

export const CampaignModel = model<ICampaignDocument, PaginateModel<ICampaign>>('campaign', campaignSchema);
