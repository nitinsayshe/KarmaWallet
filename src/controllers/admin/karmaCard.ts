import { asCustomError } from '../../lib/customError';
import { api, error } from '../../services/output';
import { IRequestHandler } from '../../types/request';
import * as KarmaCardService from '../../services/karmaCard';

export const getKarmaCardLegalText: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const legalText = await KarmaCardService.getKarmaCardLegalText();
    api(req, res, legalText);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const createKarmaCardLegalText: IRequestHandler<{}, {}, KarmaCardService.INewLegalTextRequestBody> = async (req, res) => {
  try {
    const { text, name } = req.body;
    const newLegalText = await KarmaCardService.createKarmaCardLegalText({ text, name });
    api(req, res, newLegalText);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
