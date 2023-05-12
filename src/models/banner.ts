import {
  Schema,
  model,
  Document,
  ObjectId,
  PaginateModel,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export enum IBannerColor {
  dark = 'dark',
  light = 'light',
  warning = 'warning',
}

export enum ILoggedInState {
  LoggedIn = 'loggedIn',
  LoggedOut = 'loggedOut',
  Both = 'both',
}

export interface IShareableBanner {
  _id: ObjectId;
  color: IBannerColor;
  enabled: boolean;
  endDate?: Date;
  link?: string;
  linkText?: string;
  loggedInState: ILoggedInState;
  name: string;
  startDate?: Date;
  text: string;
}

export interface IBanner extends IShareableBanner {
  createdOn: Date;
  lastModified: Date;
}

export interface IShareablePaginatedBanners {
  docs: IShareableBanner[];
  totalDocs: number;
  limit: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  page?: number | undefined;
  totalPages: number;
  offset: number;
  prevPage?: number | null | undefined;
  nextPage?: number | null | undefined;
  pagingCounter: number;
  meta?: any;
}

export type IBannerModel = IModel<IBanner>;

export interface IBannerDocument extends IBanner, Document {
  _id: ObjectId;
}

const bannerSchema = new Schema({
  color: { type: String, enum: Object.values(IBannerColor) },
  enabled: { type: Boolean, default: false },
  endDate: { type: Date },
  loggedInState: { type: String, enum: Object.values(ILoggedInState), required: true },
  text: { type: String, required: true },
  link: { type: String },
  linkText: { type: String },
  name: { type: String, required: true },
  startDate: { type: Date },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

bannerSchema.plugin(mongoosePaginate);

export const BannerModel = model<IBannerDocument, PaginateModel<IBanner>>('banner', bannerSchema);
