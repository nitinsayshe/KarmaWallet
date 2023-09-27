import { Schema, model, Document, Model, ObjectId } from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { IShareableUser, IUserDocument } from './user';
import { BankStatus } from '../lib/constants';

export interface IPlaidCardIntegration {
  accessToken: string;
  accountId: string;
  items: string[];
  publicToken: string;
  linkSessionId: string;
  institutionId: string;
  unlinkedAccessTokens: string[];
}

export interface IBankIntegrations {
  plaid?: IPlaidCardIntegration;
}

export interface IShareableBankConnection {
  userId: IRef<ObjectId, IShareableUser>;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  createdOn: Date;
  lastModified: Date;
  unlinkedDate?: Date;
  status: string,
  removedDate?: Date;
  initialTransactionsProcessing: boolean;
  lastTransactionSync: Date;
  institutionId?: string;
  isEnrolledInAutomaticRewards?: boolean;
  integrations: IBankIntegrations;
  fundingSourceToken: string;
}

export interface IBankConnection extends IShareableBankConnection {
  userId: IRef<ObjectId, IUserDocument>;
  lastFourDigitsToken?: string;
  binToken?: string;
}
export interface IBankRequestBody {
  accessToken: string;
}

export interface IBankConnectionDocument extends IBankConnection, Document { }
export type IBankConnectionModel = IModel<IBankConnection>;

const bankConnectionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  name: { type: String },
  mask: { type: String },
  type: { type: String },
  subtype: { type: String },
  logo: { type: String },
  fundingSourceToken: { type: String },
  integrations: {
    plaid: {
      type: {
        accessToken: { type: String },
        accountId: { type: String },
        items: [{ type: String }],
        publicToken: { type: String },
        linkSessionId: { type: String },
        institutionId: { type: String },
        unlinkedAccessTokens: [{ type: String }],
      },
    },
  },
  status: { type: String, default: BankStatus.Linked },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

export const BankConnectionModel = model<IBankConnectionDocument, Model<IBankConnection>>('bankConnection', bankConnectionSchema);
