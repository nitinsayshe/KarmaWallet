import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../../lib/customError';
import { TransactionModel } from '../../models/transaction';
import { IChart } from '../../types/chart';
import { IRequest } from '../../types/request';
import { getDaysInPast } from './utils';
import { IReportRequestParams, IReportRequestQuery } from './utils/types';

dayjs.extend(utc);

export const getCarbonOffsetsReport = async (req: IRequest<IReportRequestParams, IReportRequestQuery>): Promise<IChart> => {
  try {
    const _daysInPast = getDaysInPast(req.query.daysInPast || '30', 365);
    const thresholdDate = dayjs(dayjs().utc().format('MMM DD, YYYY'))
      .utc()
      .subtract(_daysInPast, 'days');

    const offsetsPurchasedBeforeThreshold = await TransactionModel.find({
      date: { $lt: thresholdDate.toDate() },
      'integrations.rare': { $exists: true },
    }).count();
    let aggData = await TransactionModel.aggregate()
      .match({
        date: { $gte: thresholdDate.toDate() },
        'integrations.rare': { $exists: true },
      })
      .project({ day: { $substr: ['$date', 0, 10] } })
      .group({ _id: '$day', count: { $sum: 1 } })
      .sort({ _id: 1 });

    let cumulator = offsetsPurchasedBeforeThreshold;
    aggData = aggData.map(d => {
      cumulator += d.count;
      d.count = cumulator;
      return d;
    });

    const data = aggData.map(d => {
      const [_, month, date] = d._id.split('-');
      const day = dayjs(`${month} ${date}`);
      return {
        label: day.format('MMM DD'),
        values: [{ value: d.count }],
      };
    });

    // TODO: iterate through all data and add in any
    // dates within this range that were skipped

    return { data };
  } catch (err) {
    throw asCustomError(err);
  }
};
