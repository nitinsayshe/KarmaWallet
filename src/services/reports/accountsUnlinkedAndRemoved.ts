import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';
import { IRequest } from '../../types/request';
import { getDaysInPast } from './utils';
import { IReportRequestParams, IReportRequestQuery } from './utils/types';

dayjs.extend(utc);

interface IAggData {
  removed: number;
  unlinked: number;
  total: number;
  label: string;
}

const mergeAggData = (
  unlinkedAggData: { count: number; unlinkedDate: Date }[],
  removedAggData: { count: number; removedDate: Date }[],
): IAggData[] => {
  const aggData: IAggData[] = [];

  // merge agg data
  let i = 0;
  let j = 0;
  while (i < unlinkedAggData.length && j < removedAggData.length) {
    const unlinkedDay = dayjs(unlinkedAggData[i].unlinkedDate);
    const removedDay = dayjs(removedAggData[j].removedDate);

    if (unlinkedDay.isBefore(removedDay)) {
      aggData.push({
        removed: removedAggData[j].count,
        unlinked: unlinkedAggData[i].count,
        total: removedAggData[j].count + unlinkedAggData[i].count,
        label: unlinkedDay.format('MMM DD'),
      });
      i++;
    } else if (unlinkedDay.isAfter(removedDay)) {
      aggData.push({
        removed: removedAggData[j].count,
        unlinked: unlinkedAggData[i].count,
        total: removedAggData[j].count + unlinkedAggData[i].count,
        label: removedDay.format('MMM DD'),
      });
      j++;
    } else {
      aggData.push({
        removed: removedAggData[j].count,
        unlinked: unlinkedAggData[i].count,
        total: removedAggData[j].count + unlinkedAggData[i].count,
        label: removedDay.format('MMM DD'),
      });
      i++;
      j++;
    }
  }

  while (i < unlinkedAggData.length) {
    aggData.push({
      removed: removedAggData[j - 1].count,
      unlinked: unlinkedAggData[i].count,
      total: removedAggData[j - 1].count + unlinkedAggData[i].count,
      label: dayjs(unlinkedAggData[i].unlinkedDate).format('MMM DD'),
    });
    i++;
  }

  while (j < removedAggData.length) {
    aggData.push({
      removed: removedAggData[j].count,
      unlinked: unlinkedAggData[i - 1].count,
      total: removedAggData[j].count + unlinkedAggData[i - 1].count,
      label: dayjs(removedAggData[j].removedDate).format('MMM DD'),
    });
    j++;
  }
  return aggData;
};

const getUnlinkedAndRemovedAccountData = async (thresholdDate: dayjs.Dayjs) => Promise.all([
  CardModel.find({
    unlinkedDate: { $lt: thresholdDate.toDate() },
  }).count(),
  CardModel.find({
    removedDate: { $lt: thresholdDate.toDate() },
  }).count(),
  CardModel.aggregate()
    .match({ unlinkedDate: { $gte: thresholdDate.toDate() } })
    .project({
      day: { $substr: ['$unlinkedDate', 0, 10] },
      unlinkedDate: '$unlinkedDate',
    })
    .group({
      _id: '$day',
      count: { $sum: 1 },
      unlinkedDate: { $first: '$unlinkedDate' },
    })
    .sort({ _id: 1 }),
  CardModel.aggregate()
    .match({ removedDate: { $gte: thresholdDate.toDate() } })
    .project({
      day: { $substr: ['$removedDate', 0, 10] },
      removedDate: '$removedDate',
    })
    .group({
      _id: '$day',
      count: { $sum: 1 },
      removedDate: { $first: '$removedDate' },
    })
    .sort({ _id: 1 }),
]);

export const getAccountsUnlinkedOrRemovedReport = async (
  req: IRequest<IReportRequestParams, IReportRequestQuery>,
) => {
  try {
    const _daysInPast = getDaysInPast(req.query.daysInPast || '30', 365);
    const thresholdDate = dayjs(dayjs().utc().format('MMM DD, YYYY'))
      .utc()
      .subtract(_daysInPast, 'days');

    const cardData = await getUnlinkedAndRemovedAccountData(thresholdDate);

    const totalUnlinkedCardsBeforeThreshold = cardData[0];
    const totalRemovedCardsBeforeThreshold = cardData[1];
    let unlinkedAggData = cardData[2];
    let removedAggData = cardData[3];

    if (!totalUnlinkedCardsBeforeThreshold
      || !totalRemovedCardsBeforeThreshold
      || !unlinkedAggData?.length
      || !removedAggData?.length) {
      throw new Error('No missing data for report');
    }

    // adjust count to include data before threshold
    let cumulator = totalUnlinkedCardsBeforeThreshold;
    unlinkedAggData = unlinkedAggData.map((d) => {
      cumulator += d.count;
      d.count = cumulator;
      return d;
    });

    cumulator = totalRemovedCardsBeforeThreshold;
    removedAggData = removedAggData.map((d) => {
      cumulator += d.count;
      d.count = cumulator;

      return d;
    });

    const data = mergeAggData(unlinkedAggData, removedAggData);
    return { data };
  } catch (err) {
    throw asCustomError(err);
  }
};
