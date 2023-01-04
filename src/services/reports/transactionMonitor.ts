import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../../lib/customError';
import { ReportModel } from '../../models/report';
import { IChart, IChartData } from '../../types/chart';
import { IRequest } from '../../types/request';
import { getDaysInPast } from './utils';
import { IReportRequestParams, IReportRequestQuery } from './utils/types';

dayjs.extend(utc);

export const getTransactionsMonitorReport = async (req: IRequest<IReportRequestParams, IReportRequestQuery>): Promise<IChart> => {
  try {
    const _daysInPast = getDaysInPast(req.query.daysInPast || '30', 365);

    const thresholdDate = dayjs(dayjs().utc().format('MMM DD, YYYY'))
      .utc()
      .subtract(_daysInPast, 'days');

    const reportsAfterThreshold = await ReportModel
      .find({
        transactionsMonitor: { $exists: true },
        createdOn: { $gte: thresholdDate.toDate() },
      })
      .sort({ createdOn: 1 })
      .lean();
    const missingCarbonMultiplierData: IChartData[] = [];

    for (const { transactionsMonitor, createdOn } of reportsAfterThreshold) {
      const missingCarbonMultiplier = transactionsMonitor.missingCarbonMultiplier > 0
        ? (transactionsMonitor.missingCarbonMultiplier / transactionsMonitor.totalTransactions) * 100
        : 0;

      const missingCompany = transactionsMonitor.missingCompany > 0
        ? (transactionsMonitor.missingCompany / transactionsMonitor.totalTransactions) * 100
        : 0;

      missingCarbonMultiplierData.push({
        label: dayjs(createdOn).format('MMM DD, YYYY'),
        values: [
          { label: 'missing carbon multiplier (%)', value: missingCarbonMultiplier },
          { label: 'missing company (%)', value: missingCompany },
        ],
      });
    }

    return {
      data: missingCarbonMultiplierData,
    };
  } catch (err) {
    throw asCustomError(err);
  }
};
