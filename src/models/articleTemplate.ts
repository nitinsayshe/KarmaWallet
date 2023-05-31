import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel } from '../types/model';

export enum IArticleType {
  GoodAndBad = 'the-good-and-the-bad',
  CompanySpotlight = 'company-spotlight',
  IndustryReport = 'industry-report',
  General = 'general',
}

export interface IArticleTemplate {
  _id: ObjectId;
  html: string;
  type: IArticleType;
}

export interface IArticleTemplateDocument extends IArticleTemplate, Document {
  _id: ObjectId;
}

export type IArticleTemplateModel = IModel<IArticleTemplate>;

const articleTemplateSchema = new Schema({
  html: { type: String, required: true },
  type: { type: String, enum: Object.values(IArticleType), required: true },
});

export const ArticleTemplateModel = model<IArticleTemplateDocument, Model<IArticleTemplateModel>>('article-template', articleTemplateSchema);
