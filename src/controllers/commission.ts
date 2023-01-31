import { IRequestHandler } from '../types/request';
import * as CommissionService from '../services/commission';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';

export const getCommissionsForUserByPayout: IRequestHandler<{}, CommissionService.IGetCommissionsForUserQuery, {}> = async (req, res) => {
  try {
    const commissions = await CommissionService.getCommissionsForUserByPayout(req);
    output.api(req, res, commissions);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getCommissionDashboardSummary: IRequestHandler = async (req, res) => {
  try {
    const summary = await CommissionService.getCommissionDashboardSummary(req);
    output.api(req, res, summary);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
