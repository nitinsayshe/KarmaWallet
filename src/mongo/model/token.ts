import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { TokenTypes } from '../../lib/constants';
import { IModel } from '../../types/model';
import schemaDefinition from '../schema/token';

export interface IToken {
  type: TokenTypes;
  value: string;
  createdOn: Date;
  expires: Date;
  user: string;
  consumed: boolean;
}

export interface ITokenDocument extends IToken, Document {}
export type ITokenModel = IModel<IToken>;

export const TokenModel = model<ITokenDocument, Model<IToken>>('token', new Schema(schemaDefinition));
