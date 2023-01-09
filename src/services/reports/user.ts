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

export const getUserReport = async (
  req: IRequest<IReportRequestParams, IReportRequestQuery>,
  fullHistory?: boolean,
): Promise<IChart> => {
  if (fullHistory === undefined || fullHistory === null) {
    fullHistory = false;
  }

  try {
    const _daysInPast = getDaysInPast(req.query.daysInPast || '30', 365);

    const thresholdDate = dayjs(dayjs().utc().format('MMM DD, YYYY'))
      .utc()
      .subtract(_daysInPast, 'days');

    const totalUsersBeforeThreshold = await UserModel.find({
      dateJoined: { $lt: thresholdDate.toDate() },
    }).count();
    let cumulator = totalUsersBeforeThreshold;

    let userAggData = [];
    if (fullHistory) {
      userAggData = await UserModel.aggregate()
        .project({
          dateJoinedDate: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$dateJoined',
            },
          },
          dateJoined: '$dateJoined',
        })
        .group({
          _id: { $month: '$dateJoined' },
          count: { $sum: 1 },
          dateJoined: { $first: '$dateJoined' },
          dateJoinedDate: { $first: '$dateJoinedDate' },
        })
        .sort({ dateJoined: 1 });
      cumulator = 0;
    } else {
      userAggData = await UserModel.aggregate()
        .match({ dateJoined: { $gte: thresholdDate.toDate() } })
        .project({
          dateJoined: '$dateJoined',
          dateJoinedDate: { $substr: ['$dateJoined', 0, 10] },
        })
        .group({
          _id: '$dateJoinedDate',
          count: { $sum: 1 },
          dateJoined: { $first: '$dateJoined' },
          dateJoinedDate: { $first: '$dateJoinedDate' },
        })
        .sort({ dateJoined: 1 });
    }

    userAggData = userAggData.map((d) => {
      cumulator += d.count;
      d.count = cumulator;
      return d;
    });

    if (!userAggData || !userAggData.length || userAggData.length === 0) {
      throw new Error('No user data found');
    }

    const totalCardsBeforeThreshold = await CardModel.aggregate()
      .group({ _id: '$userId', createdOn: { $first: '$createdOn' } })
      .match({
        createdOn: { $lt: thresholdDate.toDate() },
      });

    cumulator = totalCardsBeforeThreshold?.length || 0;

    let cardAggData = [];
    if (fullHistory) {
      cardAggData = await CardModel.aggregate()
        .project({
          createdOnDate: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdOn',
            },
          },
          createdOn: '$createdOn',
          userId: '$userId',
        })
        .group({
          _id: '$userId',
          createdOn: { $first: '$createdOn' },
          createdOnDate: { $first: '$createdOnDate' },
        })
        .group({
          _id: { $month: '$createdOn' },
          createdOn: { $first: '$createdOn' },
          createdOnDate: { $first: '$createdOnDate' },
          count: { $sum: 1 },
        })
        .sort({ createdOn: 1 });
      cumulator = 0;
    } else {
      cardAggData = await CardModel.aggregate()
        .project({
          createdOnDate: { $substr: ['$createdOn', 0, 10] },
          createdOn: '$createdOn',
          userId: '$userId',
        })
        .group({
          _id: '$userId',
          createdOnDate: { $first: '$createdOnDate' },
          createdOn: { $first: '$createdOn' },
        })
        .group({
          _id: '$createdOnDate',
          createdOnDate: { $first: '$createdOnDate' },
          createdOn: { $first: '$createdOn' },
          count: { $sum: 1 },
        })
        .match({ createdOn: { $gte: thresholdDate.toDate() } })
        .sort({ createdOnDate: 1 });
    }

    cardAggData = cardAggData.map((d) => {
      cumulator += d.count;
      d.count = cumulator;
      return d;
    });

    if (!cardAggData || !cardAggData.length || cardAggData.length === 0) {
      throw new Error('No card data found');
    }

    // merge data
    const data: IChartData<string>[] = [];
    let cardIndex = 0;
    let userIndex = 0;
    while (userIndex < userAggData.length && cardIndex < cardAggData.length) {
      let day = dayjs(new Date(userAggData[userIndex].dateJoined));

      if (cardAggData[cardIndex]?.createdOnDate === userAggData[userIndex]?.dateJoinedDate) {
        data.push({
          label: fullHistory ? day.format('MM-DD-YY') : day.format('MMM DD'),
          values: [
            { value: userAggData[userIndex].count },
            { value: cardAggData[cardIndex].count },
          ],
        });
        cardIndex++;
        userIndex++;
      } else if (cardAggData[cardIndex]?.createdOnDate < userAggData[userIndex]?.dateJoinedDate) {
        day = dayjs(new Date(cardAggData[cardIndex].createdOn));
        const currUserIndex = userIndex - 1 >= 0 ? userIndex - 1 : 0;
        data.push({
          label: fullHistory ? day.format('MM-DD-YY') : day.format('MMM DD'),
          values: [
            { value: userAggData[currUserIndex].count },
            { value: cardAggData[cardIndex].count },
          ],
        });
        cardIndex++;
      } else if (
        cardAggData[cardIndex]?.createdOnDate > userAggData[userIndex]?.dateJoinedDate
      ) {
        const currCardIndex = cardIndex - 1 >= 0 ? cardIndex - 1 : 0;
        data.push({
          label: fullHistory ? day.format('MM-DD-YY') : day.format('MMM DD'),
          values: [
            { value: userAggData[userIndex].count },
            { value: cardAggData[currCardIndex].count },
          ],
        });
        userIndex++;
      }
    }

    while (cardIndex < cardAggData.length) {
      const day = dayjs(cardAggData[cardIndex].createdOn);
      let label = day.format('MMM DD');
      if (fullHistory) {
        label = day.format('MM-DD-YY');
      }
      data.push({
        label,
        values: [
          { value: userAggData[userAggData.length - 1].count },
          { value: cardAggData[cardIndex].count },
        ],
      });
      cardIndex++;
    }

    while (userIndex < userAggData.length) {
      const day = dayjs(userAggData[userIndex].dateJoined);
      let label = day.format('MMM DD');
      if (fullHistory) {
        label = day.format('MM-DD-YY');
      }
      data.push({
        label,
        values: [
          { value: userAggData[userIndex].count },
          { value: cardAggData[cardAggData.length - 1].count },
        ],
      });
      userIndex++;
    }

    const lastDate = cardAggData[cardAggData.length - 1].createdOn
        > userAggData[userAggData.length - 1].dateJoined
      ? dayjs(cardAggData[cardAggData.length - 1].createdOn)
      : dayjs(userAggData[userAggData.length - 1].dateJoined);
    const now = dayjs();

    if (lastDate.month() < now.month() || lastDate.date() < now.date()) {
      data.push({
        label: now.format('MM-DD-YY'),
        values: [
          { value: userAggData[userAggData.length - 1].count },
          { value: cardAggData[cardAggData.length - 1].count },
        ],
      });
    }

    return { data };
  } catch (err) {
    throw asCustomError(err);
  }
};
