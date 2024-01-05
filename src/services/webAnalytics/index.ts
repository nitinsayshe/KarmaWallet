import { ObjectId } from 'mongoose';
import { IRequest } from '../../types/request';
import { WebAnalyticsModel } from '../../models/webAnalytics';
import { WebAnalyticsLocationModel } from '../../models/webAnalyticsLocations';
import CustomError from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';

export interface IWebAnalyticsRequestParams {
  id: ObjectId;
  location: string;
}

export interface IWebAnalyticsRequestBody {
  _id: string;
  location: string;
  subLocation: string;
  name: string;
  description: string;
}

export const getAllWebAnalytics = async (_req: IRequest) => {
  const webAnalytics = await WebAnalyticsModel.find({});
  return webAnalytics;
};

export const getWebAnalyticsLocations = async (_req: IRequest) => {
  const webAnalytics = await WebAnalyticsLocationModel.find({});
  return webAnalytics;
};

export const getWebAnalyticsByPage = async (_req: IRequest<IWebAnalyticsRequestParams, {}, {}>) => {
  const { location } = _req.params;
  const webAnalytics = await WebAnalyticsModel.find({ location });
  return webAnalytics;
};

export const createWebAnalytics = async (_req: IRequest<{}, {}, IWebAnalyticsRequestBody>) => {
  const { location, name, description, subLocation } = _req.body;

  const requiredFields = ['location', 'name', 'description', 'subLocation'];

  requiredFields.forEach((field) => {
    if (!_req.body[field as keyof IWebAnalyticsRequestBody]) throw new Error(`Missing required field: ${field}`);
  });

  const webAnalytics = new WebAnalyticsModel({
    location,
    subLocation,
    name,
    description,
    createdOn: new Date(),
    lastModifiedOn: new Date(),
  });

  await webAnalytics.save();
  return webAnalytics;
};

export const deleteWebAnalyticsById = async (_req: IRequest<IWebAnalyticsRequestParams, {}, {}>) => {
  const { id } = _req.params;

  const webAnalytic = await WebAnalyticsModel.findById({ _id: id });

  if (!webAnalytic) throw new CustomError('A web analytic event with that id does not exist', ErrorTypes.NOT_FOUND);

  await webAnalytic.remove();

  return { message: 'Web analytic deleted successfully' };
};
