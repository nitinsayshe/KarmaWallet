import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { CardStatus } from '../../lib/constants';
import { IModel } from '../../types/model';
import schemaDefinition from '../schema/card';

export interface IPlaidCardIntegration {
  accessToken: string;
  accountId: string;
  items: string[];
  publicToken: string;
  linkSessionId: string;
  institutionId: string;
}

export interface IRareCardIntegration {
  card_id: string;
  card_type: string;
  last_four: string;
  expr_month: number;
  expr_year: number;
}

export interface ICardIntegrations {
  plaid: IPlaidCardIntegration;
  rare: IRareCardIntegration;
}

export interface ICard {
  userId: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  status: CardStatus;
  institution: string;
  integrations: ICardIntegrations;
  createOn: Date;
  lastModeifed: Date;
}

export interface ICardDocument extends ICard, Document {}
export type ICardModel = IModel<ICard>;

export const CardModel = model<ICardDocument, Model<ICard>>('card', new Schema(schemaDefinition));
