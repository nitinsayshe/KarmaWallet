import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel } from '../types/model';

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
  companyId: string;
  dateWritten: string;
  bannerImageUrl: string;
  introParagraph: string;
  theGood: ITheGood[];
  theBad: ITheBad[];
}

export interface IArticleDocument extends IArticle, Document {
  _id: ObjectId;
}

export type IArticleModel = IModel<IArticle>;

const articleSchema = new Schema({
  companyId: { type: String, required: true },
  dateWritten: { type: String, required: true },
  bannerImageUrl: { type: String, required: true },
  introParagraph: { type: String, required: true },
  theGood: [{
    type: {
      paragraphTitle: { type: String },
      paragraphBody: { type: String },
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
      paragraphTitle: { type: String },
      paragraphBody: { type: String },
      imageUrl: { type: String },
      imageSource: { type: String },
      imageAlignment: { type: String, enum: Object.values(ImageAlignment) },
    },
    required: true,
  }],
});

export const ArticleModel = model<IArticleDocument, Model<IArticle>>('article', articleSchema);
