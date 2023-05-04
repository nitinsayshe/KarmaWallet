import aqp from 'api-query-params';
import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as BannerService from '../../services/banner';
import { asCustomError } from '../../lib/customError';

export const getBanners: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const banners = await BannerService.getBanners(req, query);
    output.api(req, res, banners);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createBanner: IRequestHandler<{}, {}, BannerService.IBannerRequestBody> = async (req, res) => {
  try {
    const banner = await BannerService.createBanner(req);
    output.api(req, res, banner);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateBanner: IRequestHandler<{ bannerId: string }, {}, BannerService.IBannerRequestBody> = async (req, res) => {
  try {
    const banner = await BannerService.updateBanner(req);
    output.api(req, res, banner);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
