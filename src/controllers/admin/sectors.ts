import { api, error } from '../../services/output';
import { asCustomError } from '../../lib/customError';
import { IRequestHandler } from '../../types/request';
import * as SectorService from '../../services/sectors';

export const checkName: IRequestHandler<{}, SectorService.ICheckSectorNameQuery> = async (req, res) => {
  try {
    const status = await SectorService.checkSectorName(req);
    api(req, res, status);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const updateSector: IRequestHandler<SectorService.ISectorRequestParams, {}, SectorService.IUpdateSectorRequestBody> = async (req, res) => {
  try {
    const sector = await SectorService.updateSector(req);
    api(req, res, SectorService.getShareableSector(sector));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
