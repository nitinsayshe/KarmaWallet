import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { ReportModel } from '../../models/report';
import { IChart } from '../../types/chart';
import { IRequest } from '../../types/request';
import { IReportRequestParams, IReportRequestQuery } from './utils/types';

dayjs.extend(utc);

export const getUserReport = async (_: IRequest<IReportRequestParams, IReportRequestQuery>): Promise<IChart> => {
  try {
    const userMetricsReport = await ReportModel.findOne({
      $and: [
        { userMetrics: { $exists: true } },
        { userMetrics: { $ne: null } },
      ],
    }).sort({ createdOn: -1 }).lean();
    if (!userMetricsReport || !userMetricsReport.userMetrics) throw new CustomError('Error retrieving report data', ErrorTypes.SERVER);
    const data = userMetricsReport.userMetrics.data.map((r) => ({
      label: r.label,
      values: [
        { value: r.values[0].value },
        { value: r.values[1].value },
      ],
    }));
    return { data } as unknown as IChart;
  } catch (err) {
    throw asCustomError(err);
  }
};
