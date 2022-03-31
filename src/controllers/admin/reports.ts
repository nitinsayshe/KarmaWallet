import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as ReportService from '../../services/reports';
import { asCustomError } from '../../lib/customError';
import { IReportRequestParams } from '../../services/reports/utils/types';

export const getAllReports: IRequestHandler = async (req, res) => {
  try {
    const reports = await ReportService.getAllReports(req);
    output.api(req, res, reports);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getReport: IRequestHandler<IReportRequestParams> = async (req, res) => {
  try {
    const reportData = await ReportService.getReport(req);
    output.api(req, res, reportData);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getSummary: IRequestHandler = async (req, res) => {
  try {
    const summary = await ReportService.getSummary(req);
    output.api(req, res, summary);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
