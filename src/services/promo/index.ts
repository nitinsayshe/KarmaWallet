import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { CampaignModel } from '../../models/campaign';
import { IPromo, IPromoTypes, IShareablePromo, PromoModel } from '../../models/promo';
import { IRequest } from '../../types/request';
import { getShareableCampaign } from '../campaign';

export interface IPromoRequestBody {
  name: string;
  enabled?: boolean;
  limit: number;
  amount: number;
  type: IPromoTypes;
  headerText: string;
  successText: string;
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
  successText,
  headerText,
  type,
  amount,
  limit,
  enabled,
  name,
  campaign,
}: IPromo) => {
  const shareable: IShareablePromo = {
    _id,
    headerText,
    type,
    promoText,
    successText,
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
  const { name, enabled, limit, amount, disclaimerText, promoText, campaign, headerText, successText, type } = req.body;
  let campaignId;

  if (!name) throw new CustomError('A promo name is required.', ErrorTypes.INVALID_ARG);
  if (!limit) throw new CustomError('A promo limit is required.', ErrorTypes.INVALID_ARG);
  if (!amount) throw new CustomError('A promo amount is required.', ErrorTypes.INVALID_ARG);
  if (!promoText) throw new CustomError('A promo text is required.', ErrorTypes.INVALID_ARG);
  if (!headerText) throw new CustomError('A promo header text is required.', ErrorTypes.INVALID_ARG);
  if (!successText) throw new CustomError('A promo success text is required.', ErrorTypes.INVALID_ARG);
  if (!type) throw new CustomError('A promo type is required.', ErrorTypes.INVALID_ARG);

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
      type,
      headerText,
      successText,
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
    const { name, enabled, limit, amount, disclaimerText, promoText, campaign, type, headerText, successText } = req.body;

    if (!promoId) throw new CustomError('A promo id is required.', ErrorTypes.INVALID_ARG);
    if (!name && !limit && !amount && !promoText && !disclaimerText && enabled === undefined && !campaign) throw new CustomError('No promo fields were provided.', ErrorTypes.INVALID_ARG);

    const promo = await PromoModel.findById(promoId);
    if (!promo) throw new CustomError(`No promo with id ${promoId} was found.`, ErrorTypes.NOT_FOUND);
    // check for values and update
    if (name) promo.name = name;
    if (limit) promo.limit = limit;
    if (amount) promo.amount = amount;
    if (promoText) promo.promoText = promoText;
    if (headerText) promo.headerText = headerText;
    if (successText) promo.successText = successText;
    if (type) promo.type = type;
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
