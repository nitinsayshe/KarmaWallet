/* eslint-disable no-loop-func */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isBetween from 'dayjs/plugin/isBetween';
import { isValidObjectId } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { IUserMonthlyImpactReport, IUserMonthlyImpactReportWithEquivalencies, UserMontlyImpactReportModel } from '../../models/userMonthlyImpactReport';
import { IRequest } from '../../types/request';
import * as CarbonService from '../impact/utils/carbon';
import { getAmountForTotalEquivalency } from '../impact';
import { getRandomInt } from '../../lib/number';
import { getShareableTransaction } from '../transaction';
import { CompanyModel } from '../../models/company';

dayjs.extend(utc);
dayjs.extend(isBetween);

interface IUserImpactReportSummaryMonthData {
  date: Date;
  reportId?: string;
  score?: number;
  withinDataRange: boolean;
}

interface IUserImpactReportSummaryAnnualData {
  year: number;
  data: IUserImpactReportSummaryMonthData[];
}

interface IUserImpactReportSummary {
  annualData: IUserImpactReportSummaryAnnualData[];
}

export interface IUserImpactReportParams {
  reportId: string;
}

export const getShareableUserMonthlyImpactReport = async (report: IUserMonthlyImpactReportWithEquivalencies | IUserMonthlyImpactReport) => {
  const transactions = [];
  for (const transaction of report.transactions) {
    const shareableTransaction = await getShareableTransaction(transaction);
    transactions.push(shareableTransaction);
  }
  return {
    ...report,
    transactions,
  };
};

// retrieve an individual impact report, that will take a month and year as params and pull report based on that
export const getUserImpactReport = async (req: IRequest<IUserImpactReportParams>): Promise<IUserMonthlyImpactReportWithEquivalencies> => {
  const { requestor } = req;
  const { reportId } = req.params;

  if (!reportId) throw new CustomError('A report id is required.', ErrorTypes.INVALID_ARG);
  if (!isValidObjectId(reportId)) throw new CustomError('Invalid report id found. Please check id and try again.', ErrorTypes.INVALID_ARG);

  let report: Partial<IUserMonthlyImpactReportWithEquivalencies>;

  try {
    report = await UserMontlyImpactReportModel
      .findOne({ _id: reportId, user: requestor._id })
      .populate({ path: 'transactions.company', model: CompanyModel })
      .lean() as Partial<IUserMonthlyImpactReportWithEquivalencies>;
  } catch {
    throw new CustomError('Error retrieving report. Please try again.', ErrorTypes.SERVER);
  }

  if (!report) throw new CustomError(`No report found with id: ${reportId}.`, ErrorTypes.NOT_FOUND);

  const { netEmissions, totalEmissions, offsets, monthlyEmissions } = report.carbon;
  // get total equiv
  const totalEquivalencies = CarbonService.getEquivalencies(getAmountForTotalEquivalency(netEmissions, totalEmissions, offsets.totalOffset));
  const totalEquivalency = totalEquivalencies.negative[getRandomInt(0, totalEquivalencies.negative.length - 1)];
  totalEquivalency.type = CarbonService.EquivalencyObjectType.Total;

  // get monthly equiv
  const monthlyEquivalencies = CarbonService.getEquivalencies(monthlyEmissions);
  const monthlyEquivalenciesFiltered = monthlyEquivalencies.negative.filter(eq => eq.icon !== totalEquivalency.icon);
  const monthlyEquivalency = monthlyEquivalenciesFiltered[getRandomInt(0, monthlyEquivalenciesFiltered.length - 1)];
  if (monthlyEquivalency) monthlyEquivalency.type = CarbonService.EquivalencyObjectType.Monthly;

  const equivalencies = [totalEquivalency, monthlyEquivalency];

  // conditionally add offset equivalency
  if (offsets.totalOffset > 0) {
    const { positive } = CarbonService.getEquivalencies(offsets.totalOffset);
    const equivalency = positive[getRandomInt(0, positive.length - 1)];
    equivalencies.push({ ...equivalency, type: CarbonService.EquivalencyObjectType.Offsets });
  }

  report.carbon.equivalencies = equivalencies;

  return report as IUserMonthlyImpactReportWithEquivalencies;
};

// gets all of the months that the user has data for
export const getUserImpactReportsSummary = async (req: IRequest): Promise<IUserImpactReportSummary> => {
  const { requestor } = req;

  const defaultSummary: IUserImpactReportSummary = {
    annualData: [],
  };

  try {
    const userImpactReports = await UserMontlyImpactReportModel.find({ user: requestor._id }).sort({ date: -1 });

    if (!userImpactReports.length) return defaultSummary;

    const startDate = dayjs(userImpactReports[userImpactReports.length - 1].date).utc().startOf('month');
    const endDate = dayjs(userImpactReports[0].date).utc().endOf('month');
    const now = dayjs().utc();
    const endMonth = now.endOf('year');
    const years: IUserImpactReportSummaryAnnualData[] = [];
    let currentDate = startDate.startOf('year');

    while (currentDate.isBefore(endMonth)) {
      const year = currentDate.year();
      let yearObj = years.find(y => y.year === year);

      if (!yearObj) {
        yearObj = { year, data: [] };
        years.push(yearObj);
      }

      const monthReport = userImpactReports.find(x => {
        const reportDate = dayjs(x.date).utc();
        return reportDate.isSame(currentDate, 'month') && reportDate.isSame(currentDate, 'year');
      });

      yearObj.data.push({
        date: currentDate.toDate(),
        score: monthReport?.impact?.score ? monthReport.impact.score : null,
        // hasData is a flag that this month has data available
        reportId: monthReport?._id.toString(),
        // withinDataRange is a flag that this month is within the first month that a user
        // linked a card and the last report available for a user
        withinDataRange: currentDate.add(1, 'day').isBetween(startDate, endDate),
      });

      currentDate = currentDate.add(1, 'month');
    }

    return {
      ...defaultSummary,
      annualData: years,
    };
  } catch {
    throw new CustomError('Error getting user impact reports', ErrorTypes.SERVER);
  }
};
