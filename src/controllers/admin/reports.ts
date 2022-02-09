import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as ReportService from '../../services/reports';
import { asCustomError } from '../../lib/customError';

export const getSummary: IRequestHandler = async (req, res) => {
  try {
    const summary = await ReportService.getSummary(req);
    output.api(req, res, summary);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
