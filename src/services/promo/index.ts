import { PromoModel } from '../../models/promo';
import { IRequest } from '../../types/request';

export const getPromos = async (_req: IRequest) => PromoModel.find({});
