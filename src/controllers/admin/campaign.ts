import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as CampaignService from '../../services/campaign';
import { asCustomError } from '../../lib/customError';

export const getCampaigns: IRequestHandler = async (req, res) => {
  try {
    const campaigns = await CampaignService.getCampaigns(req);
    output.api(req, res, campaigns);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
