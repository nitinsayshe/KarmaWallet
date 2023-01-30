import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as PromoService from '../services/promo';

export const getPromos: IRequestHandler = async (req, res) => {
  try {
    const promos = await PromoService.getPromos(req);
    api(req, res, promos);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
