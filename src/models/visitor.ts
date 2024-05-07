import {
  Document, model, ObjectId, PaginateModel, Schema,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IMarqetaKycState, IMarqetaUserStatus } from '../integrations/marqeta/types';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { IShareableUser, IUser, IUrlParam, UserEmailStatus } from './user/types';
import { PersonaIntegrationSchema } from './schemas';
import { IPersonaIntgration } from '../integrations/persona/types';

interface IMarqetaKycResult {
  status: IMarqetaKycState;
  codes: string[];
}

interface IMarqetaIdentification {
  type: string;
  value: string;
}

export const VisitorActionEnum = {
  PendingApplication: 'pendingApplication',
  AppliedForCard: 'appliedForCard',
  ApplicationDeclined: 'applicationDeclined',
} as const;
export type VisitorActionEnumValues = typeof VisitorActionEnum[keyof typeof VisitorActionEnum];

export interface IMarqetaVisitorData {
  userToken: string;
  email: string;
  kycResult: IMarqetaKycResult;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  account_holder_group_token?: string;
  identifications?: IMarqetaIdentification[];
  status?: IMarqetaUserStatus;
  created_time?: string;
}

export interface IVisitorIntegrations {
  groupCode?: string;
  urlParams?: IUrlParam[];
  shareASale?: {
    sscid?: string;
    xTypeParam?: string;
    sscidCreatedOn?: string;
    trackingId?: string;
  };
  marqeta?: IMarqetaVisitorData;
  persona?: IPersonaIntgration;
}

export interface IVisitorAction {
  type: VisitorActionEnumValues;
  createdOn: Date;
}

export interface IShareableVisitor {
  email: string;
  emailStatus: UserEmailStatus;
  integrations?: IVisitorIntegrations;
  statusLastModified: Date;
  createdOn: Date;
}

export interface IVisitor extends IShareableVisitor {
  user?: IRef<ObjectId, (IShareableUser | IUser)>;
  actions?: IVisitorAction[];
}

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
