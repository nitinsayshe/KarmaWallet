import { FilterQuery, PaginateResult } from 'mongoose';
import { IRequest } from '../../types/request';
import CustomError, { asCustomError } from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';
import { ALPHANUMERIC_REGEX } from '../../lib/constants/regex';
import { BannerModel, IBanner, ILoggedInState, IShareableBanner } from '../../models/banner';

export interface IBannerRequestBody {
  name: string;
  text: string;
  color: string;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
  loggedInState: ILoggedInState;
}

export const getShareableBanner = ({
  _id,
  name,
  text,
  startDate,
  color,
  endDate,
  enabled,
  loggedInState,
}: IShareableBanner) => ({
  _id,
  name,
  text,
  startDate,
  endDate,
  enabled,
  color,
  loggedInState,
});

export const getShareablePaginatedBanners = ({
  docs,
  totalDocs,
  limit,
  hasPrevPage,
  hasNextPage,
  page,
  totalPages,
  offset,
  prevPage,
  nextPage,
  pagingCounter,
  meta,
}: PaginateResult<IBanner>) => ({
  docs: docs.map(b => getShareableBanner(b)),
  totalDocs,
  limit,
  hasPrevPage,
  hasNextPage,
  page,
  totalPages,
  offset,
  prevPage,
  nextPage,
  pagingCounter,
  meta,
});

export const getBanners = async (__: IRequest, query: FilterQuery<IBanner>) => {
  const { projection, skip, limit } = query;
  const invalidQuery = !ALPHANUMERIC_REGEX.test(projection) || !ALPHANUMERIC_REGEX.test(skip) || !ALPHANUMERIC_REGEX.test(limit);
  if (invalidQuery) throw new CustomError('Invalid query parameters.', ErrorTypes.INVALID_ARG);

  const options = {
    projection: projection || '',
    page: skip || 1,
    limit: limit || 10,
  };

  const filter: FilterQuery<IBanner> = { ...query.filter };
  const paginatedBanners = await BannerModel.paginate(filter, options);
  return getShareablePaginatedBanners(paginatedBanners);
};

export const createBanner = async (req: IRequest<{}, {}, IBannerRequestBody>) => {
  const { name, text, startDate, endDate, loggedInState } = req.body;
  if (!name) throw new CustomError('A banner name is required.', ErrorTypes.INVALID_ARG);
  if (!text) throw new CustomError('Banner html text is required.', ErrorTypes.INVALID_ARG);
  if (!loggedInState) throw new CustomError('A banner logged in state is required.', ErrorTypes.INVALID_ARG);

  const modelData: IBannerRequestBody = {
    name,
    text,
    color,
    enabled: false,
    loggedInState,
  };

  if (startDate) modelData.startDate = startDate;
  if (endDate) modelData.endDate = endDate;

  try {
    const banner = new BannerModel(modelData);
    banner.save();
    return getShareableBanner(banner);
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updateBanner = async (req: IRequest<{ bannerId: string }, {}, IBannerRequestBody>) => {
  const { bannerId } = req.params;
  if (!bannerId) throw new CustomError('A banner id is required.', ErrorTypes.INVALID_ARG);
  const { name, text, startDate, endDate, loggedInState, enabled } = req.body;
  if (!name && !text && !loggedInState && !enabled) throw new CustomError('Missing banner fields.', ErrorTypes.INVALID_ARG);
  const bannerToUpdate = await BannerModel.findOne({ _id: bannerId });
  if (!bannerToUpdate) throw new CustomError('Banner not found.', ErrorTypes.NOT_FOUND);
  if (name !== bannerToUpdate.name) bannerToUpdate.name = name;
  if (text !== bannerToUpdate.text) bannerToUpdate.text = text;
  if (startDate !== bannerToUpdate?.startDate || !bannerToUpdate?.startDate) bannerToUpdate.startDate = startDate;
  if (endDate !== bannerToUpdate?.endDate || !bannerToUpdate?.endDate) bannerToUpdate.endDate = endDate;
  if (loggedInState !== bannerToUpdate.loggedInState) bannerToUpdate.loggedInState = loggedInState;
  if (enabled !== bannerToUpdate.enabled) bannerToUpdate.enabled = enabled;
  bannerToUpdate.save();
  return getShareableBanner(bannerToUpdate);
};
