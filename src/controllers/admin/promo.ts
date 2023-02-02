import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as PromoService from '../../services/promo';
import { asCustomError } from '../../lib/customError';

export const updatePromo: IRequestHandler<PromoService.IPromoRequestParams, {}, PromoService.IPromoRequestBody> = async (req, res) => {
  try {
    const promo = await PromoService.updatePromo(req);
    output.api(req, res, promo);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createPromo: IRequestHandler<PromoService.IPromoRequestParams, {}, PromoService.IPromoRequestBody> = async (req, res) => {
  try {
    const promo = await PromoService.createPromo(req);
    output.api(req, res, promo);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
