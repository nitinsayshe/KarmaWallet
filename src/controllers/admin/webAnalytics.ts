import { api, error } from '../../services/output';
import { asCustomError } from '../../lib/customError';
import { IRequestHandler } from '../../types/request';
import * as WebAnalyticsService from '../../services/webAnalytics';

export const getAllWebAnalytics: IRequestHandler = async (req, res) => {
  try {
    const analytics = await WebAnalyticsService.getAllWebAnalytics(req);
    api(req, res, analytics);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getWebAnalyticsByPage: IRequestHandler<WebAnalyticsService.IWebAnalyticsRequestParams, {}, {}> = async (req, res) => {
  try {
    const analytics = await WebAnalyticsService.getWebAnalyticsByPage(req);
    api(req, res, analytics);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

// export const createWebAnalytic: IRequestHandler = async (req, res) => {
//   try {
//     const analytic = await WebAnalyticsService.createWebAnalytics(req);
//     api(req, res, analytic);
//   } catch (err) {
//     error(req, res, asCustomError(err));
//   }
// };
