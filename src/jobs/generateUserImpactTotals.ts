import { count } from 'aws-sdk/clients/health';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Types } from 'mongoose';
import { TransactionModel } from '../models/transaction';
import { IUserDocument, UserModel } from '../models/user';
import { IUserImpactMonthData, IUserImpactSummary, IUserImpactTotalDocument, IUserImpactTotalScores, UserImpactTotalModel } from '../models/userImpactTotals';
import { getImpactScores, getImpactSummary, getMonthlyImpactBreakdown, getUserImpactRatings } from '../services/impact/utils';

dayjs.extend(utc);

/**
 * this file contains all the logic used to calculate
 * user_impact_totals.
 */

const saveUserImpactTotal = async (
  user: IUserDocument,
  transactions: number,
  summary: IUserImpactSummary,
  totalScores: IUserImpactTotalScores,
  monthlyBreakdown: IUserImpactMonthData[],
) => {
  const timestamp = dayjs().utc().toDate();
  let userImpactTotal: IUserImpactTotalDocument = await UserImpactTotalModel.findOne({ user });

  if (!!userImpactTotal) {
    const updatedData = {
      summary,
      totalScores,
      monthlyBreakdown,
      totalTransactions: transactions,
      lastModified: timestamp,
    };

    return UserImpactTotalModel.findOneAndUpdate({ user }, updatedData, { new: true });
  }

  userImpactTotal = new UserImpactTotalModel({
    user,
    summary,
    totalScores,
    monthlyBreakdown,
    totalTransactions: transactions,
    createdOn: timestamp,
  });

  return userImpactTotal.save();
};

const getImpactTotalsForAllUsers = (allUserImpactData: IUserImpactTotalDocument[], ratings: [number, number][]) => {
  let _totalTransactions = 0;
  let _scoresTotal = 0;
  const _summaryScores: {[key: string]: number} = {};
  const _monthlyBreakdown: IUserImpactMonthData[] = [];
  const _monthlyBreakdownCounts: {[key: string]: count} = {};
  const dateFormat = 'MM-YYYY';

  for (const userImpactData of allUserImpactData) {
    for (const monthBreakdown of userImpactData.monthlyBreakdown) {
      let existing = _monthlyBreakdown.find(mb => dayjs(mb.date).format(dateFormat) === dayjs(monthBreakdown.date).format(dateFormat));

      if (!existing) {
        existing = {
          date: monthBreakdown.date,
          negative: 0,
          neutral: 0,
          positive: 0,
          score: 0,
          transactionCount: 0,
        };
        _monthlyBreakdown.push(existing);
      }

      if (!_monthlyBreakdownCounts[dayjs(monthBreakdown.date).format(dateFormat)]) {
        _monthlyBreakdownCounts[dayjs(monthBreakdown.date).format(dateFormat)] = 0;
      }

      existing.negative += monthBreakdown.negative;
      existing.neutral += monthBreakdown.neutral;
      existing.positive += monthBreakdown.positive;

      existing.score += monthBreakdown.score;
      existing.transactionCount += monthBreakdown.transactionCount;

      if (!!monthBreakdown.transactionCount) {
        _monthlyBreakdownCounts[dayjs(monthBreakdown.date).format(dateFormat)] += 1;
      }
    }

    for (const score of userImpactData.summary.scores) {
      const scoreStr = `${score.score}`;
      if (!_summaryScores[scoreStr]) _summaryScores[scoreStr] = 0;
      _summaryScores[scoreStr] += score.amount;
      _scoresTotal += score.amount;
    }

    _totalTransactions += userImpactData.totalTransactions;
  }

  for (const monthBreakdown of _monthlyBreakdown) {
    const _count = _monthlyBreakdownCounts[dayjs(monthBreakdown.date).format(dateFormat)];
    if (!_count) continue;

    monthBreakdown.negative /= _count;
    monthBreakdown.neutral /= _count;
    monthBreakdown.positive /= _count;
    monthBreakdown.score /= _count;
  }

  const impactScores = getImpactScores({ scores: _summaryScores, total: _scoresTotal }, ratings);

  const sortedMonths = _monthlyBreakdown.sort((x, y) => {
    if (x.date.getTime() < y.date.getTime()) return 1;
    if (x.date.getTime() > y.date.getTime()) return -1;
    return 0;
  });

  return {
    summary: {
      scores: Object.entries(_summaryScores).map(([score, amount]) => ({ score: parseFloat(score), amount })),
      total: _scoresTotal,
    },
    totalScores: impactScores,
    monthlyBreakdown: sortedMonths,
    totalTransactions: _totalTransactions,
  };
};

const getTransactions = (userId: Types.ObjectId) => TransactionModel
  .aggregate([
    {
      $match: {
        $and: [
          { user: userId },
          { company: { $ne: null } },
        ],
      },
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      },
    },
    {
      $addFields: {
        sectors: {
          $reduce: {
            input: '$company.sectors',
            initialValue: [],
            in: {
              $concatArrays: [
                '$$value', '$$this.sector',
              ],
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: 'sectors',
        localField: 'sectors',
        foreignField: '_id',
        as: 'popSectors',
      },
    },
    {
      $unwind: {
        path: '$company',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        'company.combinedScore': { $ne: null },
      },
    },
    {
      $project: {
        sectors: 0,
      },
    },
    {
      $sort: {
        date: -1,
      },
    },
  ]);

export const exec = async () => {
  console.log('\ngenerating user impact totals...');

  let errorCount = 0;

  let users: IUserDocument[];
  let allImpactTotals: IUserImpactTotalDocument[];
  let ratings: [number, number][];
  let appUser: IUserDocument;
  let totalTransactionsCount = 0;

  try {
    users = await UserModel.find({});
    allImpactTotals = await UserImpactTotalModel.find({});
    ratings = await getUserImpactRatings();
  } catch (err) {
    console.log('[-] error loading users, user impact ratings, and existing user impact totals');
    console.log(err);
  }

  if (!users || !allImpactTotals) return;

  const allUserImpactData: IUserImpactTotalDocument[] = [];

  for (const user of users) {
    if (user._id.toString() === process.env.APP_USER_ID) {
      appUser = user;
      continue;
    }

    try {
      const transactions = await getTransactions(user._id);

      if (!transactions?.length) continue;

      totalTransactionsCount += transactions.length;

      const monthData = getMonthlyImpactBreakdown(transactions, ratings);

      if (user._id.toString() === '62192d3af022c9e3fbfe3c6d') {
        console.log('>>>>> monthData', monthData);
      }

      const summary = getImpactSummary(transactions);
      const impactScores = getImpactScores(summary, ratings);

      const parsedSummary = {
        ...summary,
        scores: Object.entries(summary.scores).map(([score, amount]) => ({ score: parseFloat(score), amount })),
      };

      allUserImpactData.push(await saveUserImpactTotal(user, transactions.length, parsedSummary, impactScores, monthData));
    } catch (err) {
      console.log(`\n[-] error generating impact total for user: ${user._id}`);
      console.log(err, '\n');
      errorCount += 1;
      continue;
    }
  }

  const { summary, totalScores, monthlyBreakdown } = getImpactTotalsForAllUsers(allUserImpactData, ratings);
  await saveUserImpactTotal(appUser, totalTransactionsCount, summary, totalScores, monthlyBreakdown);

  const completeMessage = !!errorCount
    ? `[!] generating user impact totals completed with ${errorCount} errors.`
    : `[+] ${users.length} user impact totals generated successfully`;

  console.log(`\n${completeMessage}\n`);
};
