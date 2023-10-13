import {
  Schema,
  model,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel } from '../types/model';
import { getUtcDate } from '../lib/date';

export enum DeleteRequestReason {
  SecurityPrivacy = 'Privacy or security concerns',
  DontUnderstandPlatform = 'I don\'t understand the platform',
  DontUseKarmaWalletEnough = 'I don\'t use Karma Wallet enough',
  CashbackIssues = 'Issues related to cashback',
  CostOfPlatform = 'Cost of platform',
  Other = 'Other',
}

export enum DeleteRequestStatus {
  Open = 'Open',
  Closed = 'Closed',
  Resolved = 'Resolved',
}

export interface IDeleteAccountRequest {
  userId: ObjectId;
  userName: string;
  userEmail: string;
  reason: string;
  status: DeleteRequestReason;
  createdOn: Date;
}

export interface IDeleteAccountRequestDocument extends IDeleteAccountRequest, Document {
  _id: ObjectId;
}

export type IDeleteAccountRequestModel = IModel<IDeleteAccountRequest>;

const deleteAccountRequestSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      enum: Object.values(DeleteRequestReason),
      required: true,
      default: DeleteRequestReason.Other,
    },
    status: {
      type: String,
      enum: Object.values(DeleteRequestStatus),
      required: true,
      default: DeleteRequestStatus.Open,
    },
    createdOn: {
      type: Date,
      required: true,
      default: () => getUtcDate(),
    },
  },
);

export const DeleteAccountRequestModel = model<IDeleteAccountRequestDocument, Model<IDeleteAccountRequest>>('delete_account_request', deleteAccountRequestSchema);
