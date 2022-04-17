import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import { api, error } from '../services/output';
import * as SectorsService from '../services/sectors';

export const getSectors: IRequestHandler<{}, SectorsService.ISectorsRequestQuery> = async (req, res) => {
  try {
    const sectors = await SectorsService.getSectors(req);
    api(req, res, { sectors: sectors.map(s => SectorsService.getShareableSector(s)) });
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
