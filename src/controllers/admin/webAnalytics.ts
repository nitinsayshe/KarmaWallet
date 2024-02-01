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

export const getWebAnalyticsLocations: IRequestHandler = async (req, res) => {
  try {
    const analytics = await WebAnalyticsService.getWebAnalyticsLocations(req);
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

export const createWebAnalytics: IRequestHandler<{}, {}, WebAnalyticsService.IWebAnalyticsRequestBody> = async (req, res) => {
  try {
    const analytic = await WebAnalyticsService.createWebAnalytics(req);
    api(req, res, analytic);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const updateWebAnalytics: IRequestHandler<WebAnalyticsService.IWebAnalyticsRequestParams, {}, WebAnalyticsService.IWebAnalyticsRequestBody> = async (req, res) => {
  try {
    const analytic = await WebAnalyticsService.updateWebAnalytics(req);
    api(req, res, analytic);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const deleteWebAnalyticsById: IRequestHandler<WebAnalyticsService.IWebAnalyticsRequestParams, {}, {}> = async (req, res) => {
  try {
    const result = await WebAnalyticsService.deleteWebAnalyticsById(req);
    api(req, res, result);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
