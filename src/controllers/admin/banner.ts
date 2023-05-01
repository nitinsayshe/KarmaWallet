import aqp from 'api-query-params';
import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as CampaignService from '../../services/campaign';
import { asCustomError } from '../../lib/customError';

export const getBanners: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const campaigns = await CampaignService.getCampaigns(req, query);
    output.api(req, res, campaigns);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createCampaign: IRequestHandler<{}, {}, CampaignService.ICampaignRequestBody> = async (req, res) => {
  try {
    const campaign = await CampaignService.createCampaign(req);
    output.api(req, res, campaign);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateCampaign: IRequestHandler<{ campaignId: string }, {}, CampaignService.ICampaignRequestBody> = async (req, res) => {
  try {
    const campaign = await CampaignService.updateCampaign(req);
    output.api(req, res, campaign);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
