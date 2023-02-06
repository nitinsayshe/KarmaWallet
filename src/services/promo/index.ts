import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { CampaignModel } from '../../models/campaign';
import { IPromo, IShareablePromo, PromoModel } from '../../models/promo';
import { IRequest } from '../../types/request';
import { getShareableCampaign } from '../campaign';

export interface IPromoRequestBody {
  name: string;
  enabled?: boolean;
  limit: number;
  amount: number;
  disclaimerText?: string;
  promoText: string;
  campaign?: string;
}

export interface IPromoRequestParams {
  promoId: string;
}

export const getShareablePromo = ({
  _id,
  promoText,
  disclaimerText,
  amount,
  limit,
  enabled,
  name,
  campaign,
}: IPromo) => {
  const shareable: IShareablePromo = {
    _id,
    promoText,
    disclaimerText,
    amount,
    limit,
    enabled,
    name,
  };

  if (campaign) {
    shareable.campaign = getShareableCampaign(campaign);
  }

  return shareable;
};

export const getPromos = async (_req: IRequest) => {
  const promos = await PromoModel.find({})
    .populate({
      path: 'campaign',
      model: CampaignModel,
    });

  return promos.map(p => getShareablePromo(p));
};

export const createPromo = async (req: IRequest<{}, {}, IPromoRequestBody>) => {
  const { name, enabled, limit, amount, disclaimerText, promoText, campaign } = req.body;
  let campaignId;

  if (!name) throw new CustomError('A promo name is required.', ErrorTypes.INVALID_ARG);
  if (!limit) throw new CustomError('A promo limit is required.', ErrorTypes.INVALID_ARG);
  if (!amount) throw new CustomError('A promo amount is required.', ErrorTypes.INVALID_ARG);
  if (!promoText) throw new CustomError('A promo text is required.', ErrorTypes.INVALID_ARG);

  if (campaign) {
    const campaignItem = await CampaignModel.findOne({ name: campaign });
    if (!campaignItem) throw new CustomError(`No campaign with id ${campaign} was found. Please check your spelling and try again.`, ErrorTypes.NOT_FOUND);
    campaignId = campaignItem;
  }

  try {
    const promo = new PromoModel({
      name,
      startDate: new Date(),
      enabled: !!enabled,
      limit,
      amount,
      disclaimerText,
      promoText,
      campaign: campaignId,
    });

    promo.save();
    return getShareablePromo(promo);
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updatePromo = async (req: IRequest<IPromoRequestParams, {}, IPromoRequestBody>) => {
  try {
    const { promoId } = req.params;
    const { name, enabled, limit, amount, disclaimerText, promoText, campaign } = req.body;

    if (!promoId) throw new CustomError('A promo id is required.', ErrorTypes.INVALID_ARG);
    if (!name && !limit && !amount && !promoText && !disclaimerText && enabled === undefined && !campaign) throw new CustomError('No promo fields were provided.', ErrorTypes.INVALID_ARG);

    const promo = await PromoModel.findById(promoId);
    if (!promo) throw new CustomError(`No promo with id ${promoId} was found.`, ErrorTypes.NOT_FOUND);
    // check for values and update
    if (name) promo.name = name;
    if (limit) promo.limit = limit;
    if (amount) promo.amount = amount;
    if (promoText) promo.promoText = promoText;
    if (disclaimerText) promo.disclaimerText = disclaimerText;
    if (enabled !== undefined) promo.enabled = enabled;
    if (campaign) {
      const campaignItem = await CampaignModel.findOne({ name: campaign });
      if (!campaignItem) {
        throw new CustomError(`No campaign with id ${campaign} was found. Please check your spelling and try again.`, ErrorTypes.NOT_FOUND);
      }
      promo.campaign = campaignItem;
    }

    promo.save();

    return getShareablePromo(promo);
  } catch (err) {
    throw asCustomError(err);
  }
};
