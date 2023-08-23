import { Schema, model, Document, Model, ObjectId } from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { IMarqetaKycResult, IShareableUser } from './user';

enum State {
  active = 'ACTIVE',
  suspended = 'SUSPENDED',
  terminated = 'TERMINATED',
  un_supported = 'UNSUPPORTED',
  un_activated = 'UNACTIVATED',
  limited = 'LIMITED'
}

interface IkarmaCard {
  token: string;
  expiration_time: Date;
  user_token: string;
  card_token: string,
  card_product_token: string;
  pan: string;
  last_four: string;
  expr_month: number;
  expr_year: number;
  created_time: Date;
  pin_is_set: boolean;
  state: string;
  instrument_type: string;
  barcode: string;
}
export interface IShareableCardApplication {
  userId?: IRef<ObjectId, IShareableUser>;
  visitorId: IRef<ObjectId, IShareableUser>;
  userToken: string;
  firstName: string;
  LastName: string;
  email: string;
  kycResult: IMarqetaKycResult;
  cards?: IkarmaCard[];
  lastModified: Date;
}

export interface IKarmaCardApplication extends IShareableCardApplication {
}

export interface IKarmaCardApplicationDocument extends IKarmaCardApplication, Document { }
export type IKarmaCardApplicationModel = IModel<IKarmaCardApplication>;

const karmaCardApplication = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  visitorId: {
    type: Schema.Types.ObjectId,
    ref: 'visitor',
    required: true,
  },
  firstName: { type: String },
  LastName: { type: String },
  userToken: { type: String },
  email: { type: String },
  kycResult: {
    status: { type: String },
    codes: { type: Array },
  },
  cards: [
    {
      type: {
        card_token: { type: String },
        card_product_token: { type: String },
        last_four: { type: String },
        pan: { type: String },
        expr_month: { type: Number },
        expr_year: { type: Number },
        pin_is_set: { type: Boolean },
        state: { type: String },
        barcode: { type: String },
        created_time: { type: Date },
        instrument_type: {
          type: String,
          enum: Object.values(State),
        },
      },
    },
  ],
  createdOn: { type: Date, default: () => getUtcDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

export const KarmaCardApplicationModel = model<IKarmaCardApplicationDocument, Model<IKarmaCardApplicationModel>>('karmaCardApplication', karmaCardApplication);
