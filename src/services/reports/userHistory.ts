import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { ReportModel } from '../../models/report';
import { IChart } from '../../types/chart';
import { IRequest } from '../../types/request';
import { IReportRequestParams, IReportRequestQuery } from './utils/types';

dayjs.extend(utc);

export const getUserHistoryReport = async (_: IRequest<IReportRequestParams, IReportRequestQuery>): Promise<IChart> => {
  try {
    const userHistoryReport = await ReportModel.findOne({
      $and: [
        { userHistory: { $exists: true } },
        { userHistory: { $ne: null } },
      ],
    }).sort({ createdOn: -1 }).lean();
    if (!userHistoryReport || !userHistoryReport.userHistory) throw new CustomError('Error retrieving report data', ErrorTypes.SERVER);
    const data = userHistoryReport.userHistory.data.map((r) => ({
      label: r.label,
      values: [
        { value: r.values[0].value },
        { value: r.values[1].value },
      ],
    }));

    return { data } as unknown as IChart<string>;
  } catch (err) {
    throw asCustomError(err);
  }
};
