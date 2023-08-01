import { IRequestHandler } from '../types/request';
import * as CardService from '../services/card';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';

export const removeCard: IRequestHandler<CardService.IRemoveCardParams, {}, CardService.IRemoveCardBody> = async (
  req,
  res,
) => {
  try {
    const linkToken = await CardService.removeCard(req);
    output.api(req, res, linkToken);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getCards: IRequestHandler = async (req, res) => {
  try {
    const cards = await CardService.getCards(req);
    output.api(
      req,
      res,
      cards.map((c) => CardService.getShareableCard(c)),
    );
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const registerCardInKardRewards: IRequestHandler<CardService.KardRewardsRegisterParams, {}, CardService.KardRewardsRegisterRequest> = async (
  req,
  res,
) => {
  try {
    const card = await CardService.registerInKardRewards(req);
    output.api(req, res, CardService.getShareableCard(card));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
