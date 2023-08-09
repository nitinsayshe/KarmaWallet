import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as KarmaCardService from '../services/karmaCard';

export const applyForKarmaCard: IRequestHandler<{}, {}, KarmaCardService.IKarmaCardRequestBody> = async (req, res) => {
  try {
    const applyResponse = await KarmaCardService.applyForKarmaCard(req);
    api(req, res, applyResponse);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
