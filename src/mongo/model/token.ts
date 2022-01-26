import {
  Schema, model, Document,
} from 'mongoose';
import { TokenTypes } from '../../lib/constants';
import schemaDefinition from '../schema/token';
import { IUserModel } from './user';

export interface IToken {
  type: TokenTypes;
  value: string;
  createdOn: Date;
  expires: Date;
  user: IUserModel['id'];
  consumed: boolean;
}

export interface ITokenModel extends IToken, Document {}

export const TokenModel = model<ITokenModel>('token', new Schema(schemaDefinition));
