import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';

dayjs.extend(utc);

export const getAccountsAddedHistoryReport = async () => {
  try {
    let aggData = await CardModel.aggregate()
      .group({
        _id: { $week: '$createdOn' },
        count: { $sum: 1 },
        createdOn: { $first: '$createdOn' },
      }) // mongodb can figure out the weekly grouping
      .sort({ createdOn: 1 });

    let cumulator = 0;
    aggData = aggData.map((d) => {
      cumulator += d.count;
      d.count = cumulator;
      return d;
    });

    if (!aggData || aggData.length <= 0) {
      throw new Error('No card data found');
    }
    const data = aggData.map((d) => {
      const day = dayjs(new Date(d.createdOn));
      return {
        label: day.format('MM-DD-YY'),
        values: [{ value: d.count }],
      };
    });

    const lastDate = dayjs(aggData[aggData.length - 1].createdOn);
    const now = dayjs();
    if (lastDate.month() < now.month() || lastDate.date() < now.date()) {
      data.push({
        label: now.format('MM-DD-YY'),
        values: [{ value: aggData[aggData.length - 1].count }],
      });
    }

    return { data };
  } catch (err) {
    throw asCustomError(err);
  }
};
