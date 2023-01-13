import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';
import { IRequest } from '../../types/request';
import { getDaysInPast } from './utils';
import { IReportRequestParams, IReportRequestQuery } from './utils/types';

dayjs.extend(utc);

export const getAccountsAddedReport = async (req: IRequest<IReportRequestParams, IReportRequestQuery>) => {
  try {
    const _daysInPast = getDaysInPast(req.query.daysInPast || '30', 365);
    const thresholdDate = dayjs(dayjs().utc().format('MMM DD, YYYY'))
      .utc()
      .subtract(_daysInPast, 'days');

    const totalCardsCreatedBeforeThreshold = await CardModel.find({ createdOn: { $lt: thresholdDate.toDate() } }).count();
    let aggData = await CardModel.aggregate()
      .match({ createdOn: { $gte: thresholdDate.toDate() } })
      .project({ day: { $substr: ['$createdOn', 0, 10] } })
      .group({ _id: '$day', count: { $sum: 1 } })
      .sort({ _id: 1 });

    let cumulator = totalCardsCreatedBeforeThreshold;
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
