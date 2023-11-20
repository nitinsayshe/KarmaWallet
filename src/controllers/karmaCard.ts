import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as KarmaCardService from '../services/karmaCard';
import { getShareableMarqetaUser } from '../services/karmaCard/utils';

export const applyForKarmaCard: IRequestHandler<{}, {}, KarmaCardService.IKarmaCardRequestBody> = async (req, res) => {
  try {
    const applyResponse = await KarmaCardService.applyForKarmaCard(req);
    api(req, res, getShareableMarqetaUser(applyResponse));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getKarmaCardApplications: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const applications = await KarmaCardService.getKarmaCardApplications();
    api(
      req,
      res,
      applications.map((application) => KarmaCardService.getShareableKarmaCardApplication(application)),
    );
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

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
