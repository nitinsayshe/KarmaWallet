import aqp from 'api-query-params';
import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as SectorService from '../services/sectors';

export const getSectors: IRequestHandler<{}, SectorService.ISectorsRequestQuery> = async (req, res) => {
  try {
    const { config } = req.query;
    const query = aqp(req.query, { skipKey: 'page' });
    const sectors = await SectorService.getSectors(req, query, config);

    api(req, res, {
      ...sectors,
      docs: sectors.docs.map(s => SectorService.getShareableSector(s)),
    });
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
