import { IRequest } from '../../types/request';
import { CampaignModel } from '../../models/campaign';

export const getCampaigns = async (_req: IRequest) => CampaignModel.find({});
