import { Schema, model, Document, Model } from 'mongoose';
import type { WP_REST_API_Post as wpRestApiPost } from 'wp-types';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export type CompaniesACF = {
  companies?: Schema.Types.ObjectId[];
};

export interface IWPArticle extends Partial<wpRestApiPost & { acf?: any }> {
  _id: Schema.Types.ObjectId;
  createdOn: Date;
  lastModified: Date;
}

export interface IWPArticleDocument extends IWPArticle, Document {
  _id: Schema.Types.ObjectId;
  id: number; // wordpress id
}

export type IWPArticleModel = IModel<IWPArticle>;

const wpArticleSchema = new Schema({
  id: { type: Number, required: true },
  date: Date,
  date_gmt: Date,
  guid: {
    rendered: String,
  },
  modified: Date,
  modified_gmt: Date,
  slug: String,
  status: String,
  type: String,
  link: String,
  title: {
    rendered: String,
  },
  excerpt: {
    rendered: String,
    protected: Boolean,
  },
  author: Number,
  featured_media: Number,
  comment_status: String,
  ping_status: String,
  sticky: Boolean,
  template: String,
  format: String,
  meta: {
    inline_featured_image: Boolean,
    footnotes: String,
  },
  categories: [Number],
  tags: [Number],
  acf: Schema.Types.Mixed,
  _links: {
    self: [
      {
        href: String,
      },
    ],
    collection: [
      {
        href: String,
      },
    ],
    about: [
      {
        href: String,
      },
    ],
    author: [
      {
        embeddable: Boolean,
        href: String,
      },
    ],
    replies: [
      {
        embeddable: Boolean,
        href: String,
      },
    ],
    version_history: [
      {
        count: Number,
        href: String,
      },
    ],
    predecessor_version: [
      {
        id: Number,
        href: String,
      },
    ],
    'wp:featuredmedia': [
      {
        embeddable: Boolean,
        href: String,
      },
    ],
    'wp:attachment': [
      {
        href: String,
      },
    ],
    'wp:term': [
      {
        taxonomy: String,
        embeddable: Boolean,
        href: String,
      },
      {
        taxonomy: String,
        embeddable: Boolean,
        href: String,
      },
    ],
    curies: [
      {
        name: String,
        href: String,
        templated: Boolean,
      },
    ],
  },
  createdOn: { type: Date, required: true, default: () => getUtcDate() },
  lastModified: { type: Date, required: true, default: () => getUtcDate() },
});

export const WPArticleModel = model<IWPArticleDocument, Model<IWPArticle>>('wp_article', wpArticleSchema);
