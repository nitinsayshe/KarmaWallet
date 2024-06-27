import { model, PaginateModel, Schema, Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { getUtcDate } from '../../lib/date';
import { IModel } from '../../types/model';
import { PersonaIntegrationSchema } from '../schemas';
import { UserEmailStatus } from '../user/types';
import { IVisitor, VisitorActionEnum } from './types';

export interface IVisitorDocument extends IVisitor, Document { }
export type IVisitorModel = IModel<IVisitor>;

const visitorSchema = new Schema({
  actions: [
    {
      type: {
        type: String,
        enum: Object.values(VisitorActionEnum),
        required: true,
      },
      createdOn: {
        type: Date,
        default: () => getUtcDate(),
        required: true,
      },
    },
  ],
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  email: {
    type: String,
    required: true,
  },
  emailStatus: {
    type: String,
    enum: Object.values(UserEmailStatus),
    default: UserEmailStatus.Unverified,
    required: true,
  },
  statusLastModified: {
    type: Date,
    default: () => getUtcDate(),
    required: true,
  },
  integrations: {
    groupCode: String,
    urlParams: { type: Array },
    shareASale: {
      sscid: { type: String },
      xTypeParam: { type: String },
      sscidCreatedOn: { type: String },
      trackingId: { type: String },
    },
    marqeta: {
      type: {
        userToken: String,
        email: String,
        kycResult: {
          status: { type: String },
          codes: { type: Array },
        },
        first_name: { type: String },
        last_name: { type: String },
        birth_date: { type: String },
        phone: { type: String },
        address1: { type: String },
        address2: { type: String },
        city: { type: String },
        state: { type: String },
        country: { type: String },
        postal_code: { type: String },
        account_holder_group_token: { type: String },
        identifications: [
          {
            type: { type: String },
            value: { type: String },
          },
        ],
        status: { type: String },
        created_time: { type: String },
      },
    },
    persona: PersonaIntegrationSchema,
  },
  createdOn: { type: Date, default: () => getUtcDate() },
});

visitorSchema.plugin(mongoosePaginate);
export const VisitorModel = model<IVisitorDocument, PaginateModel<IVisitor>>('visitor', visitorSchema);
