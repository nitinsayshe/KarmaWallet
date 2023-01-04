import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../../lib/customError';
import { UserLogModel } from '../../models/userLog';
import { IChart } from '../../types/chart';
import { IRequest } from '../../types/request';
import { getDaysInPast } from './utils';
import { IReportRequestParams, IReportRequestQuery } from './utils/types';

dayjs.extend(utc);

export const getLoginReport = async (req: IRequest<IReportRequestParams, IReportRequestQuery>, daysInPast?: number): Promise<IChart> => {
  try {
    const _daysInPast = getDaysInPast(daysInPast.toString() || req.query.daysInPast || '30', 365);

    const thresholdDate = dayjs(dayjs().utc().format('MMM DD, YYYY'))
      .utc()
      .subtract(_daysInPast, 'days');

    const aggData = await UserLogModel.aggregate([
      { $match: { date: { $gte: thresholdDate.toDate() } } },
      { $project: { day: { $substr: ['$date', 0, 10] } } },
      { $group: { _id: '$day', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const data = aggData.map(d => {
      const [_, month, date] = d._id.split('-');
      const day = dayjs(`${month} ${date}`);
      return {
        label: day.format('MMM DD'),
        values: [{ value: d.count }],
      };
    });

    return { data };
  } catch (err) {
    throw asCustomError(err);
  }
};
