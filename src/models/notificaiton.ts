import { ObjectId, Schema, model, Document, Model } from 'mongoose';
import {
  NotificationChannelEnumValue,
  NotificationTypeEnumValue,
  NotificationTypeEnum,
  NotificationChannelEnum,
  NotificationEffectsEnum,
  NotificationEffectsEnumValue,
} from '../lib/constants/notification';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export interface IShareableNotification {
  _id: ObjectId;
  createdOn: Date;
  lastModified: Date;
}

// `channels`: possible channels this notification can be sent through
// `type`: unique name for this notification
// `effects`: all effects that could be triggered for this notification
export interface INotification extends IShareableNotification {
  channels: NotificationChannelEnumValue[];
  type: NotificationTypeEnumValue;
  effects: NotificationEffectsEnumValue[];
}

export type INotificationModel = IModel<INotification>;

export interface INotificationDocument extends INotification, Document {
  _id: ObjectId;
}

const notification = new Schema({
  type: { required: true, type: String, enum: Object.values(NotificationTypeEnum) },
  channels: {
    required: true,
    type: [Object.values(NotificationChannelEnum)],
  },
  effects: { type: [Object.values(NotificationEffectsEnum)] },
  createdOn: { required: true, type: Date, default: () => getUtcDate().toDate() },
  lastModified: { required: true, type: Date, default: () => getUtcDate().toDate() },
});

export const NotificationModel = model<INotificationDocument, Model<INotification>>('notification', notification);
