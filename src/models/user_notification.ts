import { Document, Schema, model, ObjectId, PaginateModel } from 'mongoose';
import {
  NotificationChannelEnum,
  NotificationChannelEnumValue,
  NotificationTypeEnum,
  NotificationTypeEnumValue,
  PushNotificationTypes,
} from '../lib/constants/notification';
import {
  UserNotificationResourceTypeEnum,
  UserNotificationStatusEnum,
  UserNotificationStatusEnumValue,
} from '../lib/constants/user_notification';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { IUserDocument } from './user';
import { IVisitorDocument } from './visitor';

export type UserNotificationData = {
  body: string;
};

export interface IPushNotificationData extends UserNotificationData {
  title: string;
  pushNotificationType: PushNotificationTypes;
}

export interface IEarnedCashbackPushNotificationData extends IPushNotificationData{
  commissionId: Schema.Types.ObjectId;
}

export interface ICardTransitionNotificationData extends UserNotificationData {
  cardStatus: string;
}

export interface IEarnedCashbackNotificationData extends UserNotificationData {
  name: string;
  companyName: string;
  commissionId: Schema.Types.ObjectId;
}

export interface ICaseWonProvisionalCreditAlreadyIssuedNotificationData extends UserNotificationData {
  name: string;
  amount: string;
  submittedClaimDate: string;// MM/DD/YYYY
  merchantName: string;
  chargebackToken: string;
}

export interface IPayoutNotificationData extends UserNotificationData {
  name: string;
  payoutAmount: string;
}

export interface IKarmaCardWelcomeData extends UserNotificationData {
  name: string;
  newUser: boolean;
}

export interface ICaseLostProvisionalCreditIssuedData extends UserNotificationData {
  name: string;
  amount: string;
  date: string;
  reversalDate: string;
  companyName: string;
  reason: string;
}

export interface ICaseWonProvisionalCreditNotAlreadyIssuedNotificationData extends UserNotificationData {
  name: string;
  amount: string;
  companyName: string;
  date: string;
}

export interface ICardShippedNotificationData {
  name: string;
}

export interface IEmployerGiftData {
  name: string;
  amount: string;
}

export interface IProvisialCreditIssuedData extends UserNotificationData {
  name: string;
  amount: string;
  date: string;
}

export interface IBankLinkedConfirmationEmailData extends UserNotificationData {
  name: string;
  instituteName: string,
  lastDigitsOfBankAccountNumber: string
}

export type NotificationData =
  | IEarnedCashbackNotificationData
  | IPayoutNotificationData
  | IPushNotificationData
  | IKarmaCardWelcomeData

export interface IShareableUserNotification {
  createdOn: Date;
  _id: ObjectId;
}

// 'resource' is used to associate a related document to a notification
// for example, notification that was triggered by an incoming transaction
// would have a resource of type 'transaction'
// `data` is used for creating and processing the notification
export interface IUserNotification extends IShareableUserNotification {
  lastModified: Date;
  status: UserNotificationStatusEnumValue;
  type: NotificationTypeEnumValue;
  channel: NotificationChannelEnumValue;
  user?: IRef<ObjectId, IUserDocument>;
  visitor?: IRef<ObjectId, IVisitorDocument>;
  resource?: IRef<ObjectId, Document>;
  resourceType?: NotificationTypeEnumValue;
  data?: NotificationData;
}

export type IUserNotificationModel = IModel<IUserNotification>;

export interface IUserNotificationDocument extends IUserNotification, Document {
  _id: ObjectId;
}

const userNotification = new Schema({
  type: {
    required: true,
    type: String,
    enum: Object.values(NotificationTypeEnum),
  },
  status: {
    required: true,
    type: String,
    enum: Object.values(UserNotificationStatusEnum),
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  visitor: {
    type: Schema.Types.ObjectId,
    ref: 'visitor',
  },
  channel: {
    required: true,
    type: String,
    enum: Object.values(NotificationChannelEnum),
  },
  resource: {
    type: Schema.Types.ObjectId,
    refPath: 'resourceType',
  },
  resourceType: {
    type: String,
    enum: Object.values(UserNotificationResourceTypeEnum),
  },
  data: { type: Schema.Types.Mixed },
  createdOn: { required: true, type: Date, default: () => getUtcDate().toDate() },
  lastModified: { required: true, type: Date, default: () => getUtcDate().toDate() },
});

export const UserNotificationModel = model<IUserNotificationDocument, PaginateModel<IUserNotification>>(
  'user_notification',
  userNotification,
);
