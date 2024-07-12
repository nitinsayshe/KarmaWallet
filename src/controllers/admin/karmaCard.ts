import { asCustomError } from '../../lib/customError';
import { api, error } from '../../services/output';
import { IRequestHandler } from '../../types/request';
import * as KarmaCardService from '../../services/karmaCard';
import * as KarmaCardTypes from '../../services/karmaCard/types';

export const createKarmaCardLegalText: IRequestHandler<{}, {}, KarmaCardTypes.INewLegalTextRequestBody> = async (req, res) => {
  try {
    const newLegalText = await KarmaCardService.createKarmaCardLegalText(req);
    api(req, res, newLegalText);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const updateKarmaCardLegalText: IRequestHandler<KarmaCardTypes.IUpdateLegalTextRequestParams, {}, KarmaCardTypes.INewLegalTextRequestBody> = async (req, res) => {
  try {
    const legalText = await KarmaCardService.updateKarmaCardLegalText(req);
    api(req, res, legalText);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const deleteKarmaCardLegalText: IRequestHandler<KarmaCardTypes.IUpdateLegalTextRequestParams, {}, KarmaCardTypes.INewLegalTextRequestBody> = async (req, res) => {
  try {
    const legalText = await KarmaCardService.deleteKarmaCardLegalText(req);
    api(req, res, legalText);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
