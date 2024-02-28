import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel, IRef } from '../types/model';
import { IShareableUser } from './user/types';

export interface IShareableACHFundingSource {
  _id: ObjectId;
  userId: IRef<ObjectId, IShareableUser>;
  token: string;
  account_suffix: string;
  verification_status: string;
  account_type: string;
  name_on_account: string;
  active: boolean;
  date_sent_for_verification: Date;
  partner: string;
  partner_account_link_reference_token: string;
  accessToken: string;
  is_default_account: boolean;
  verification_override: boolean;
  verification_notes: string;
  user_token: string;
  created_time: Date;
  last_modified_time: Date;
}

export interface IACHFundingSource extends IShareableACHFundingSource {
  _id: ObjectId;
}

export interface IACHFundingSourceDocument extends IACHFundingSource, Document {
  _id: ObjectId;
}

export type IACHFundingSourceModel = IModel<IACHFundingSource>;

const ACHFundingSourceSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  token: { type: String },
  account_suffix: { type: String },
  verification_status: { type: String },
  account_type: { type: String },
  name_on_account: { type: String },
  active: { type: Boolean },
  date_sent_for_verification: { type: Date },
  partner: { type: String },
  partner_account_link_reference_token: { type: String },
  accessToken: { type: String },
  is_default_account: { type: Boolean },
  verification_override: { type: Boolean },
  verification_notes: { type: String },
  user_token: { type: String },
  created_time: { type: Date },
  last_modified_time: { type: Date },
});

export const ACHFundingSourceModel = model<IACHFundingSourceDocument, Model<IACHFundingSource>>('ach_funding_source', ACHFundingSourceSchema);
