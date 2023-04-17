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

export enum ICampaignParamKeys {
  UTM_CAMPAIGN = 'utm_campaign',
  UTM_SOURCE = 'utm_source',
  UTM_MEDIUM = 'utm_medium',
}

export interface ICampaign {
  lastModified: Date;
  createdOn: Date;
  name: string;
  description?: string;
  paramKeyToUse?: ICampaignParamKeys;
  _id: ObjectId;
}

export interface IShareableCampaign {
  _id: ObjectId;
  name: string;
  paramKeyToUse?: ICampaignParamKeys;
  description: string;
}

export interface IShareablePaginatedCampaigns {
  docs: IShareableCampaign[];
  totalDocs: number;
  limit: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  page?: number | undefined;
  totalPages: number;
  offset: number;
  prevPage?: number | null | undefined;
  nextPage?: number | null | undefined;
  pagingCounter: number;
  meta?: any;
}

export type ICampaignModel = IModel<ICampaign>;

export interface ICampaignDocument extends ICampaign, Document {
  _id: ObjectId;
}

const campaignSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: false },
  paramKeyToUse: { type: String, required: false },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

campaignSchema.plugin(mongoosePaginate);

export const CampaignModel = model<ICampaignDocument, PaginateModel<ICampaign>>('campaign', campaignSchema);
