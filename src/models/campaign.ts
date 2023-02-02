import {
  Schema,
  model,
  Document,
  ObjectId,
  PaginateModel,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel } from '../types/model';

export interface ICampaign {
  name: string;
  description?: string;
}

export interface ICampaignDocument extends ICampaign, Document {
  _id: ObjectId;
}

export type ICampaignModel = IModel<ICampaign>;

const campaignSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: false },
});

campaignSchema.plugin(mongoosePaginate);

export const CampaignModel = model<ICampaignDocument, PaginateModel<ICampaign>>('capaign', campaignSchema);
