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

export enum ImageAlignment {
  Left = 'Left',
  Right = 'Right',
  Above = 'Above'
}
export interface ITheBad {
  paragraphTitle: string;
  paragraphBody: string;
  imageUrl?: string;
  imageSource?: string;
  imageAlignment?: ImageAlignment;
}

export interface ITheGood extends ITheBad {
  quote: string;
  initiatives: [string];
}

export interface IArticle {
  _id: ObjectId;
  company: IRef<ObjectId, ICompany | ICompanyDocument | IShareableCompany >;
  createdOn: Date;
  lastModified: Date;
  publishedOn: Date;
  bannerImageUrl: string;
  introParagraph: string;
  theGood: ITheGood[];
  theBad: ITheBad[];
  enabled: boolean;
}

export interface IArticleDocument extends IArticle, Document {
  _id: ObjectId;
}

export type IArticleModel = IModel<IArticle>;

const articleSchema = new Schema({
  enabled: { type: Boolean, required: true, default: false },
  company: { type: Schema.Types.ObjectId, ref: 'companies', required: true },
  createdOn: { type: Date, required: true, default: () => getUtcDate() },
  lastModified: { type: Date, required: true, default: () => getUtcDate() },
  publishedOn: { type: Date, default: null },
  bannerImageUrl: { type: String, required: true },
  introParagraph: { type: String, required: true },
  theGood: [{
    type: {
      paragraphTitle: { type: String, required: true },
      paragraphBody: { type: String, required: true },
      imageUrl: { type: String },
      imageSource: { type: String },
      imageAlignment: { type: String, enum: Object.values(ImageAlignment) },
      quote: { type: String },
      initiatives: { type: [String] },
    },
    required: true,
  }],
  theBad: [{
    type: {
      paragraphTitle: { type: String, required: true },
      paragraphBody: { type: String, required: true },
      imageUrl: { type: String },
      imageSource: { type: String },
      imageAlignment: { type: String, enum: Object.values(ImageAlignment) },
    },
    required: true,
  }],
});

export const ArticleModel = model<IArticleDocument, Model<IArticle>>('article', articleSchema);
