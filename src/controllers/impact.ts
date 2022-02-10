import { asCustomError } from '../lib/customError';
import * as output from '../services/output';
import * as ImpactService from '../services/impact';
import { IRequestHandler } from '../types/request';

export const getCarbonOffsetsAndEmissions: IRequestHandler = async (req, res) => {
  try {
    const carbonOffsetsAndEmissionsData = await ImpactService.getCarbonOffsetsAndEmissions(req);
    output.api(req, res, carbonOffsetsAndEmissionsData);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getCarbonOffsetDonationSuggestions: IRequestHandler = async (req, res) => {
  try {
    const offsetDonationSuggestions = await ImpactService.getCarbonOffsetDonationSuggestions(req);
    output.api(req, res, offsetDonationSuggestions);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
