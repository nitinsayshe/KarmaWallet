import { IRequestHandler } from '../types/request';
import * as UserMonthlyImpactReportService from '../services/userImpactReport';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';

export const getUserImpactReportsSummary: IRequestHandler = async (req, res) => {
  try {
    output.api(req, res, await UserMonthlyImpactReportService.getUserImpactReportsSummary(req));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getUserImpactReport: IRequestHandler<UserMonthlyImpactReportService.IUserImpactReportParams> = async (req, res) => {
  try {
    const userImpactReport = await UserMonthlyImpactReportService.getUserImpactReport(req);
    output.api(req, res, UserMonthlyImpactReportService.getShareableUserMonthlyImpactReport(userImpactReport));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
