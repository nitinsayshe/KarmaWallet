import { Schema, model, Document, PaginateModel, ObjectId } from 'mongoose';
import { IModel, IRef } from '../types/model';
import { getUtcDate } from '../lib/date';
import { IUserDocument } from './user';

export enum NotificationResourceType {
  Group = 'group',
  Transaction = 'transaction',
  CommissionPayout = 'commissionPayout',
}

export enum NotificationType {
  Marketing = 'marketing',
  Group = 'transaction',
  EarnedCashback = 'earnedCashback',
  Payout = 'payout',
  // Card Transition notification is added for testing purpose only
  CardTransition = 'cardTransition'
}
export enum NotificationStatus {
  /* if queuing Notifications for future dates:
   * Queued = 'queued', */
  Unread = 'unread',
  Read = 'read',
  Deleted = 'deleted',
}

export enum NotificationChannel {
  Email = 'email',
  Push = 'push',
  None = 'none'
}

export type EarnedCashbackNotificationData = {
  name: string;
  companyName: string;
  amount?: string
};

export type PayoutNotificationData = {
  name: string;
  payoutAmount: string;
};

// Card Transition notification is added for testing purpose only
export type CardTransitionNotificationData = {
  cardStatus: string
}

export interface IShareableNotification {
  createdOn: Date;
  body: string;
  _id: ObjectId;
}

export interface INotification extends IShareableNotification {
  lastModified: Date;
  status: NotificationStatus;
  type: NotificationType;
  user: IRef<ObjectId, IUserDocument>;
  resource: IRef<ObjectId, Document>;
  data: EarnedCashbackNotificationData | PayoutNotificationData | CardTransitionNotificationData;
}

export type INotificationModel = IModel<INotification>;

export interface INotificationDocument extends INotification, Document {
  _id: ObjectId;
}

const notification = new Schema({
  type: {
    required: true,
    type: String,
    enum: Object.values(NotificationType),
  },
  body: { type: String },
  channel: {
    type: String,
    enum: Object.values(NotificationChannel),
  },
  status: {
    required: true,
    type: String,
    enum: Object.values(NotificationStatus),
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  resource: {
    type: Schema.Types.ObjectId,
    refPath: 'resourceType',
  },
  resourceType: {
    type: String,
    enum: Object.values(NotificationResourceType),
  },
  data: { type: Schema.Types.Mixed },
  createdOn: { required: true, type: Date, default: () => getUtcDate().toDate() },
  lastModified: { required: true, type: Date, default: () => getUtcDate().toDate() },
});

export const NotificationModel = model<INotificationDocument, PaginateModel<INotification>>(
  'notification',
  notification,
);
