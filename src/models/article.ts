import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel, IRef } from '../types/model';
import { ICompany, ICompanyDocument, IShareableCompany } from './company';

export enum IArticleType {
  GoodAndBad = 'the-good-and-the-bad',
  CompanySpotlight = 'company-spotlight',
  IndustryReport = 'industry-report',
}

export interface IArticle {
  _id: ObjectId;
  company: IRef<ObjectId, ICompany | ICompanyDocument | IShareableCompany >;
  createdOn: Date;
  description: string;
  lastModified: Date;
  publishedOn: Date;
  bannerImageUrl: string;
  introParagraph: string;
  introTitle: string;
  theGood: string;
  theBad: string;
  enabled: boolean;
  type: IArticleType;
  featured: boolean;
  body: string;
  alternateTitle: string;
  alternateLogo: string;
}

export interface IArticleDocument extends IArticle, Document {
  _id: ObjectId;
}

export type IArticleModel = IModel<IArticle>;

const articleSchema = new Schema({
  enabled: { type: Boolean, required: true, default: false },
  description: { type: String, required: true },
  company: { type: Schema.Types.ObjectId, ref: 'companies' },
  createdOn: { type: Date, required: true, default: () => getUtcDate() },
  lastModified: { type: Date, required: true, default: () => getUtcDate() },
  publishedOn: { type: Date, default: null },
  bannerImageUrl: { type: String, required: true },
  introParagraph: { type: String, required: true },
  introTitle: { type: String, required: true },
  theGood: { type: String, required: true },
  theBad: { type: String, required: true },
  type: { type: String, enum: Object.values(IArticleType), required: true },
  featured: { type: Boolean, default: false },
  body: { type: String, required: false },
  alternateTitle: { type: String, required: false },
  alternateLogo: { type: String, required: false },
  noCompanySlug: { type: String, required: false },
});

export const ArticleModel = model<IArticleDocument, Model<IArticle>>('article', articleSchema);
