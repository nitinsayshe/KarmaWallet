import { asCustomError } from '../../lib/customError';
import { api, error } from '../../services/output';
import { IRequestHandler } from '../../types/request';
import * as KarmaCardService from '../../services/karmaCard';

export const createKarmaCardLegalText: IRequestHandler<{}, {}, KarmaCardService.INewLegalTextRequestBody> = async (req, res) => {
  try {
    const newLegalText = await KarmaCardService.createKarmaCardLegalText(req);
    api(req, res, newLegalText);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const updateKarmaCardLegalText: IRequestHandler<KarmaCardService.IUpdateLegalTextRequestParams, {}, KarmaCardService.INewLegalTextRequestBody> = async (req, res) => {
  try {
    const legalText = await KarmaCardService.updateKarmaCardLegalText(req);
    api(req, res, legalText);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
