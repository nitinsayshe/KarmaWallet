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

export enum ArticleTypes {
  GoodAndBad = 'the-good-and-the-bad',
  CompanySpotlight = 'company-spotlight',
  IndustryReport = 'industry-report',
  General = 'general',
  Feature = 'feature',
}

export enum ArticleHeaderTypes {
  LogoAndTitle = 'logo-and-title',
  CompanyAndRating = 'company-and-rating',
  TitleOnly = 'title-only',
}

export interface IArticle {
  _id: ObjectId;
  company: IRef<ObjectId, ICompany | ICompanyDocument | IShareableCompany>;
  createdOn: Date;
  lastModified: Date;
  publishedOn: Date;
  enabled: boolean;
  type: ArticleTypes;
  featured: boolean;
  body: string;
  // used on homepage
  description: string;
  // used in article body AND in article list view AND homepage as fallback
  introParagraph: string;
  // used in article body, in article list view, URL
  title: string;
  headerTitle: string;
  // if no company and no header logo, this is the list view background
  headerBackground: string;
  // if no company, this is the list view background
  headerLogo: string;
  // overrides the list view background image
  listViewImage: string;
  headerType: ArticleHeaderTypes,
  deleted: boolean;
}

// list view background order
// listViewImage > company > headerLogo > headerBackground

// industry-report/{{ articleType }}/{{ companyName || '' + title }}/{{article._id}}

export interface IArticleDocument extends IArticle, Document {
  _id: ObjectId;
}

export type IArticleModel = IModel<IArticle>;

const articleSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'companies' },
  createdOn: { type: Date, required: true, default: () => getUtcDate() },
  lastModified: { type: Date, required: true, default: () => getUtcDate() },
  publishedOn: { type: Date, default: null },
  enabled: { type: Boolean, required: true, default: false },
  type: { type: String, enum: Object.values(ArticleTypes), required: true },
  featured: { type: Boolean, default: false },
  body: { type: String, required: false },
  description: { type: String },
  introParagraph: { type: String, required: true },
  title: { type: String, required: true },
  headerTitle: { type: String, required: false },
  headerBackground: { type: String, required: false },
  headerLogo: { type: String, required: false },
  listViewImage: { type: String, required: false },
  headerType: {
    type: String,
    enum: Object.values(ArticleHeaderTypes),
    required: true,
    default: ArticleHeaderTypes.LogoAndTitle,
  },
  deleted: { type: Boolean, required: true, default: false },
});

export const ArticleModel = model<IArticleDocument, Model<IArticle>>('articles', articleSchema);
