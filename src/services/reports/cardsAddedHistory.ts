import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';

dayjs.extend(utc);

export const getCardsAddedHistoryReport = async () => {
  try {
    console.log('getting all cards');
    const totalCardsCreatedBeforeThreshold = await CardModel.find({}).count();
    let aggData = await CardModel.aggregate()
      .group({ _id: { $week: '$createdOn' }, count: { $sum: 1 }, createdOn: { $first: '$createdOn' } }) // mongodb can figure out the weekly grouping
      .project({ count: '$count', createdOn: { $substr: ['$createdOn', 0, 10] } })
      .sort({ _id: 1 });

    let cumulator = totalCardsCreatedBeforeThreshold;
    aggData = aggData.map(d => {
      cumulator += d.count;
      d.count = cumulator;
      return d;
    });

    const data = aggData.map(d => {
      const [ year, month, date] = d.createdOn.split('-');
      const day = dayjs(new Date(year, month, date));
      return {
        label: day.format('MM-DD-YY'),
        values: [{ value: d.count }],
      };
    });

    return { data };
  } catch (err) {
    throw asCustomError(err);
  }
};
