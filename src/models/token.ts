import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { TokenTypes } from '../lib/constants';
import { IModel, IRef } from '../types/model';
import { IShareableUser, IUser } from './user';
import { getUtcDate } from '../lib/date';

export interface IToken {
  type: TokenTypes;
  value: string;
  createdOn: Date;
  expires: Date;
  user: IRef<Schema.Types.ObjectId, (IShareableUser | IUser)>;
  resource: {
    email: string,
  },
  consumed: boolean;
}

export interface ITokenDocument extends IToken, Document {}
export type ITokenModel = IModel<IToken>;

const tokenSchema = new Schema({
  type: { type: String, required: true, enum: Object.values(TokenTypes) },
  value: { type: String, required: true },
  createdOn: { type: Date, default: () => getUtcDate() },
  expires: { type: Date, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'user' },
  resource: {
    email: { type: String },
  },
  consumed: { type: Boolean, default: false },
});

export const TokenModel = model<ITokenDocument, Model<IToken>>('token', tokenSchema);
