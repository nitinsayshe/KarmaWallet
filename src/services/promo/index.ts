import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { PromoModel } from '../../models/promo';
import { IRequest } from '../../types/request';

export interface IPromoRequestBody {
  name: string;
  enabled?: boolean;
  limit: number;
  amount: number;
  disclaimerText?: string;
  promoText: string;
}

export interface IPromoRequestParams {
  promoId: string;
}

export const getPromos = async (_req: IRequest) => PromoModel.find({});

export const createPromo = async (req: IRequest<{}, {}, IPromoRequestBody>) => {
  const { name, enabled, limit, amount, disclaimerText, promoText } = req.body;

  if (!name) throw new CustomError('A promo name is required.', ErrorTypes.INVALID_ARG);
  if (!limit) throw new CustomError('A promo limit is required.', ErrorTypes.INVALID_ARG);
  if (!amount) throw new CustomError('A promo amount is required.', ErrorTypes.INVALID_ARG);
  if (!promoText) throw new CustomError('A promo text is required.', ErrorTypes.INVALID_ARG);

  try {
    const promo = new PromoModel({
      name,
      startDate: new Date(),
      enabled: !!enabled,
      limit,
      amount,
      disclaimerText,
      promoText,
    });

    return promo.save();
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updatePromo = async (req: IRequest<IPromoRequestParams, {}, IPromoRequestBody>) => {
  try {
    const { promoId } = req.params;
    if (!promoId) throw new CustomError('A promo id is required.', ErrorTypes.INVALID_ARG);
    const { name, enabled, limit, amount, disclaimerText, promoText } = req.body;

    if (!name && !limit && !amount && !promoText && !disclaimerText && enabled === undefined) throw new CustomError('No promo fields were provided.', ErrorTypes.INVALID_ARG);

    const promo = await PromoModel.findById(promoId);

    if (!promo) throw new CustomError(`No promo with id ${promoId} was found.`, ErrorTypes.NOT_FOUND);

    if (name) promo.name = name;
    if (limit) promo.limit = limit;
    if (amount) promo.amount = amount;
    if (promoText) promo.promoText = promoText;
    if (disclaimerText) promo.disclaimerText = disclaimerText;
    if (enabled !== undefined) promo.enabled = enabled;

    return promo.save();
  } catch (err) {
    throw asCustomError(err);
  }
};
