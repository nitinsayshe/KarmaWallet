import aqp from 'api-query-params';
import { IRequestHandler } from '../types/request';
import * as BannerService from '../services/banner';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';

export const getActiveBanners: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const banners = await BannerService.getActiveBanners(req, query);

    output.api(req, res, banners);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
