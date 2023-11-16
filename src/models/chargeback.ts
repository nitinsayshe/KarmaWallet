import { Schema, model, Document, Model, ObjectId } from 'mongoose';
import {
  ChargebackResponseStateEnumValues,
  ChargebackResponseChannelEnumValues,
  ChargebackResponseChannelEnum,
  ChargebackResponseStateEnum,
} from '../clients/marqeta/types';
import { ChargebackTypeEnumValues, ChargebackTypeEnum } from '../lib/constants';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export interface MarqetaChargebackIntegration {
  token: string;
  state: ChargebackResponseStateEnumValues;
  previous_state: ChargebackResponseStateEnumValues;
  channel: ChargebackResponseChannelEnumValues;
  reason: string;
  transaction_token: string;
  created_time: Date;
  last_modified_time: Date;
  type: ChargebackTypeEnumValues;
  relatedChargebacks?: Partial<MarqetaChargebackIntegration>[];
}

export interface IChargeback {
  _id: ObjectId;
  integrations: {
    marqeta: MarqetaChargebackIntegration;
  };
  createdOn: Date;
  lastModified: Date;
}

export interface IChargebackDocument extends IChargeback, Document {
  _id: ObjectId;
}

export interface IChargebackModel extends IModel<IChargeback> {}

const ChargebackSchema = new Schema({
  integrations: {
    type: {
      marqeta: {
        type: {
          token: { type: String, required: true, unique: true },
          state: { type: String, enum: Object.values(ChargebackResponseStateEnum) },
          previous_state: { type: String, enum: Object.values(ChargebackResponseStateEnum) },
          channel: { type: String, enum: Object.values(ChargebackResponseChannelEnum) },
          type: { type: String, enum: Object.values(ChargebackTypeEnum) },
          reason: { type: String },
          transaction_token: { type: String },
          created_time: { type: Date },
          last_modified_time: { type: Date },
          relatedChargebacks: [
            {
              type: {
                token: { type: String, required: true, unique: true },
                state: { type: String, enum: Object.values(ChargebackResponseStateEnum) },
                previous_state: { type: String, enum: Object.values(ChargebackResponseStateEnum) },
                channel: { type: String, enum: Object.values(ChargebackResponseChannelEnum) },
                type: { type: String, enum: Object.values(ChargebackTypeEnum) },
                reason: { type: String },
                transaction_token: { type: String },
                created_time: { type: Date },
                last_modified_time: { type: Date },
              },
            },
          ],
        },
      },
    },
  },

  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

export const ChargebackModel = model<IChargebackDocument, Model<IChargeback>>('chargeback', ChargebackSchema);
