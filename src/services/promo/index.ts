import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { PromoModel } from '../../models/promo';
import { IRequest } from '../../types/request';

export interface IPromoRequestBody {
  name: string;
  enabled?: boolean;
  limit: number;
  rewardAmount: number;
  disclaimerText?: string;
  promoText: string;
}

export const getPromos = async (_req: IRequest) => PromoModel.find({});

export const createPromo = async (req: IRequest<{}, {}, IPromoRequestBody>) => {
  const { name, enabled, limit, rewardAmount, disclaimerText, promoText } = req.body;

  if (!name) throw new CustomError('A promo name is required.', ErrorTypes.INVALID_ARG);
  if (!limit) throw new CustomError('A promo limit is required.', ErrorTypes.INVALID_ARG);
  if (!rewardAmount) throw new CustomError('A promo reward amount is required.', ErrorTypes.INVALID_ARG);
  if (!promoText) throw new CustomError('A promo text is required.', ErrorTypes.INVALID_ARG);

  try {
    const promo = new PromoModel({
      name,
      startDate: new Date(),
      enabled: !!enabled,
      limit,
      rewardAmount,
      disclaimerText,
      promoText,
    });

    return promo.save();
  } catch (err) {
    throw asCustomError(err);
  }
};
