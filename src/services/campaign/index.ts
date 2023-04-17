import { FilterQuery, PaginateResult } from 'mongoose';
import { IRequest } from '../../types/request';
import { CampaignModel, ICampaign, ICampaignParamKeys } from '../../models/campaign';
import CustomError, { asCustomError } from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';
import { ALPHANUMERIC_REGEX } from '../../lib/constants/regex';

export interface ICampaignRequestBody {
  name: string;
  description?: string;
  paramKeyToUse?: ICampaignParamKeys;
}

export const getShareableCampaign = ({
  _id,
  description,
  name,
  paramKeyToUse,
}: ICampaign) => ({
  _id,
  description,
  name,
  paramKeyToUse,
});

export const getShareablePaginatedCampaigns = ({
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
}: PaginateResult<ICampaign>) => ({
  docs: docs.map(c => getShareableCampaign(c)),
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

export const getCampaigns = async (__: IRequest, query: FilterQuery<ICampaign>) => {
  const { projection, skip, limit } = query;
  const invalidQuery = !ALPHANUMERIC_REGEX.test(projection) || !ALPHANUMERIC_REGEX.test(skip) || !ALPHANUMERIC_REGEX.test(limit);
  if (invalidQuery) throw new CustomError('Invalid query parameters.', ErrorTypes.INVALID_ARG);

  const options = {
    projection: projection || '',
    page: skip || 1,
    limit: limit || 10,
  };

  const filter: FilterQuery<ICampaign> = { ...query.filter };
  const paginatedCampaigns = await CampaignModel.paginate(filter, options);
  return getShareablePaginatedCampaigns(paginatedCampaigns);
};

export const createCampaign = async (req: IRequest<{}, {}, ICampaignRequestBody>) => {
  const { name, description, paramKeyToUse } = req.body;
  if (!name) throw new CustomError('A campaign name is required.', ErrorTypes.INVALID_ARG);

  try {
    const campaign = new CampaignModel({
      name,
      description,
      paramKeyToUse,
    });
    campaign.save();
    return getShareableCampaign(campaign);
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updateCampaign = async (req: IRequest<{ campaignId: string }, {}, ICampaignRequestBody>) => {
  const { campaignId } = req.params;
  if (!campaignId) throw new CustomError('A campaign id is required.', ErrorTypes.INVALID_ARG);
  const { name, description, paramKeyToUse } = req.body;
  if (!name && !description && !paramKeyToUse) throw new CustomError('No campaign fields were provided.', ErrorTypes.INVALID_ARG);

  try {
    const campaign = await CampaignModel.findOneAndUpdate({ _id: campaignId }, { name, description, paramKeyToUse }, { new: true }).lean();
    return getShareableCampaign(campaign);
  } catch (err) {
    throw asCustomError(err);
  }
};
