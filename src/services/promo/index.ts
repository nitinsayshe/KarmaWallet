import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { CampaignModel } from '../../models/campaign';
import { IPromo, IPromoEvents, IPromoTypes, IShareablePromo, PromoModel } from '../../models/promo';
import { IRequest } from '../../types/request';
import { getShareableCampaign } from '../campaign';

export interface IPromoRequestBody {
  amount: number;
  campaign?: string;
  disclaimerText?: string;
  enabled?: boolean;
  endDate: Date;
  events: IPromoEvents[];
  headerText: string;
  imageUrl?: string;
  limit: number;
  name: string;
  promoText: string;
  startDate: Date;
  successText: string;
  type: IPromoTypes;
}

export interface IPromoRequestParams {
  promoId: string;
}

export const getShareablePromo = ({
  _id,
  amount,
  campaign,
  disclaimerText,
  enabled,
  endDate,
  events,
  headerText,
  imageUrl,
  limit,
  name,
  promoText,
  startDate,
  successText,
  type,
}: IPromo) => {
  const shareable: IShareablePromo = {
    _id,
    amount,
    disclaimerText,
    enabled,
    endDate,
    events,
    headerText,
    imageUrl,
    limit,
    name,
    promoText,
    startDate,
    successText,
    type,
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
  const { name, enabled, limit, amount, disclaimerText, promoText, imageUrl, campaign, headerText, successText, type, endDate, startDate, events } = req.body;
  let campaignId;

  if (!events) throw new CustomError('A promo event is required.', ErrorTypes.INVALID_ARG);
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
      amount,
      campaign: campaignId,
      disclaimerText,
      enabled: !!enabled,
      endDate,
      events,
      headerText,
      imageUrl,
      limit,
      name,
      promoText,
      startDate,
      successText,
      type,
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
    const { name, enabled, limit, amount, disclaimerText, promoText, campaign, type, headerText, endDate, startDate, successText, imageUrl, events } = req.body;

    if (!promoId) throw new CustomError('A promo id is required.', ErrorTypes.INVALID_ARG);
    if (!name && !limit && !amount && !promoText && !disclaimerText && enabled === undefined && !campaign && !events) throw new CustomError('No promo fields were provided.', ErrorTypes.INVALID_ARG);

    const promo = await PromoModel.findById(promoId);
    if (!promo) throw new CustomError(`No promo with id ${promoId} was found.`, ErrorTypes.NOT_FOUND);
    // check for values and update
    if (name) promo.name = name;
    if (event) promo.events = events;
    if (limit) promo.limit = limit;
    if (amount) promo.amount = amount;
    if (promoText) promo.promoText = promoText;
    if (headerText) promo.headerText = headerText;
    if (successText) promo.successText = successText;
    if (type) promo.type = type;
    if (disclaimerText) promo.disclaimerText = disclaimerText;
    if (endDate) promo.endDate = endDate;
    if (startDate) promo.startDate = startDate;
    if (imageUrl) promo.imageUrl = imageUrl;
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
