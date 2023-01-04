import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';
import { UserModel } from '../../models/user';
import { IChart, IChartData } from '../../types/chart';
import { IRequest } from '../../types/request';
import { getDaysInPast } from './utils';
import { IReportRequestParams, IReportRequestQuery } from './utils/types';

dayjs.extend(utc);

export const getUserReport = async (req: IRequest<IReportRequestParams, IReportRequestQuery>): Promise<IChart> => {
  try {
    const _daysInPast = getDaysInPast(req.query.daysInPast || '30', 365);

    const thresholdDate = dayjs(dayjs().utc().format('MMM DD, YYYY'))
      .utc()
      .subtract(_daysInPast, 'days');

    const totalUsersBeforeThreshold = await UserModel.find({ dateJoined: { $lt: thresholdDate.toDate() } }).count();
    let userAggData: { _id: string, count: number}[] = await UserModel.aggregate()
      .match({ dateJoined: { $gte: thresholdDate.toDate() } })
      .project({ day: { $substr: ['$dateJoined', 0, 10] } })
      .group({ _id: '$day', count: { $sum: 1 } })
      .sort({ _id: 1 });

    let cumulator = totalUsersBeforeThreshold;
    userAggData = userAggData.map(d => {
      cumulator += d.count;
      d.count = cumulator;
      return d;
    });

    const totalCardsBeforeThreshold = await CardModel.find({ createdOn: { $lt: thresholdDate.toDate() } }).count();
    let cardAggData: { _id: string, count: number}[] = await CardModel.aggregate()
      .match({ createdOn: { $gte: thresholdDate.toDate() } })
      .group({ _id: '$userId', createdOn: { $first: '$createdOn' } })
      .project({ day: { $substr: ['$createdOn', 0, 10] } })
      .group({ _id: '$day', count: { $sum: 1 } })
      .sort({ _id: 1 });

    cumulator = totalCardsBeforeThreshold;
    cardAggData = cardAggData.map(d => {
      cumulator += d.count;
      d.count = cumulator;
      return d;
    });

    if (userAggData?.length !== cardAggData?.length) {
      throw new Error('error generating user report');
    }

    const data: IChartData<string>[] = [];
    for (let i = 0; i < cardAggData.length; i++) {
      const [_, month, date] = userAggData[i]._id.split('-');
      const day = dayjs(`${month} ${date}`);
      data.push({
        label: day.format('MMM DD'),
        values: [{ value: userAggData[i].count }, { value: cardAggData[i].count }],
      });
    }
    return { data };
  } catch (err) {
    throw asCustomError(err);
  }
};
