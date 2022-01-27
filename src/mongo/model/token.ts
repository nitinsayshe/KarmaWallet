import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { TokenTypes } from '../../lib/constants';
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
export interface ITokenModel extends Model<IToken> {}

export const TokenModel = model<ITokenDocument, ITokenModel>('token', new Schema(schemaDefinition));
