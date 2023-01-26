import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as PromoService from '../services/promo';
import { IPromoRequestBody } from '../services/promo';

export const getPromos: IRequestHandler = async (req, res) => {
  try {
    const promos = await PromoService.getPromos(req);
    api(req, res, promos);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const createPromo: IRequestHandler<{}, {}, IPromoRequestBody> = async (req, res) => {
  try {
    const data = await PromoService.createPromo(req);
    api(req, res, data);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
