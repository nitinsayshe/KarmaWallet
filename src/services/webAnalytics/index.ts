import { IRequest } from '../../types/request';
import { WebAnalyticsModel } from '../../models/webAnalytics';

export interface IWebAnalyticsRequestParams {
  location: string;
}

export const getAllWebAnalytics = async (_req: IRequest) => {
  const webAnalytics = await WebAnalyticsModel.find({});
  return webAnalytics;
};

export const getWebAnalyticsByPage = async (_req: IRequest<IWebAnalyticsRequestParams, {}, {}>) => {
  const { location } = _req.params;
  const webAnalytics = await WebAnalyticsModel.find({ location });
  return webAnalytics;
};
