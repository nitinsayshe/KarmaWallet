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
  LoggedIn = 'LoggedIn',
  LoggedOut = 'LoggedOut',
  Both = 'Both',
}

export interface IShareableBanner {
  _id: ObjectId;
  enabled: boolean;
  endDate?: Date;
  loggedInState: ILoggedInState;
  text: string;
  name: string;
  startDate?: Date;
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
  enabled: { type: Boolean, required: true },
  endDate: { type: Date },
  loggedInState: { type: ILoggedInState, required: true },
  text: { type: String, required: true },
  name: { type: String, required: true },
  startDate: { type: Date },
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

bannerSchema.plugin(mongoosePaginate);

export const BannerModel = model<IBannerDocument, PaginateModel<IBanner>>('banner', bannerSchema);
