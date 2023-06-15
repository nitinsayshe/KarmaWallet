import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel } from '../types/model';
import { ArticleTypes } from './article';

export interface IArticleTemplate {
  _id: ObjectId;
  html: string;
  type: ArticleTypes;
}

export interface IArticleTemplateDocument extends IArticleTemplate, Document {
  _id: ObjectId;
}

export type IArticleTemplateModel = IModel<IArticleTemplate>;

const articleTemplateSchema = new Schema({
  html: { type: String, required: true },
  type: { type: String, enum: Object.values(ArticleTypes), required: true },
});

export const ArticleTemplateModel = model<IArticleTemplateDocument, Model<IArticleTemplateModel>>('article-template', articleTemplateSchema);
