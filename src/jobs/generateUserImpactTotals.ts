import { count } from 'aws-sdk/clients/health';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Types } from 'mongoose';
import { ICompanyDocument } from '../models/company';
import { ITransactionDocument, TransactionModel } from '../models/transaction';
import { IUserDocument, UserModel } from '../models/user';
import { IUserImpactMonthData, IUserImpactSummary, IUserImpactTotalDocument, IUserImpactTotalScores, UserImpactTotalModel } from '../models/userImpactTotals';
import { getUserImpactRatings } from '../services/impact/utils';

dayjs.extend(utc);

/**
 * this file contains all the logic used to calculate
 * user_impact_totals.
 */

interface IImpactSummary {
  scores: { [key: string]: number };
  total: number;
}

enum Ratings {
  Positive = 'positive',
  Neutral = 'neutral',
  Negative = 'negative',
}

const getCompanyRating = ([neg, neut, pos]: [number, number][], score: number) => {
  if (score === null) return null;

  if (score >= neg[0] && score <= neg[1]) return Ratings.Negative;
  if (score >= neut[0] && score <= neut[1]) return Ratings.Neutral;
  if (score >= pos[0] && score <= pos[1]) return Ratings.Positive;

  return null;
};

const getImpactScores = ({ scores, total }: IImpactSummary, ratings: [number, number][]) => {
  const impactScores = { score: 0, positive: 0, negative: 0, neutral: 0 };

  const _scores = Object.keys(scores)
    .map(s => parseFloat(s));

  for (const score of _scores) {
    const amount = scores[`${score}`];
    const totalPercentage = amount / total;
    const rawImpact = totalPercentage * score;
    const rating = getCompanyRating(ratings, score);
    impactScores.score += rawImpact;
    impactScores[rating] += totalPercentage;
  }

  return impactScores;
};

const getImpactSummary = (transactions: ITransactionDocument[]): IImpactSummary => {
  const scores: { [key: string]: number } = {};
  let total = 0;

  for (const transaction of transactions) {
    const { amount } = transaction;
    const { combinedScore } = transaction.company as ICompanyDocument;

    // exclude companies with a null combined score
    if (typeof combinedScore !== 'number') continue;

    const _combinedScore = `${combinedScore}`;

    if (!scores[_combinedScore]) scores[_combinedScore] = 0;

    scores[_combinedScore] += amount;
    total += amount;
  }

  return {
    scores,
    total,
  };
};

const getMonthStartDate = (date: dayjs.Dayjs) => date
  .set('date', 1)
  .set('hours', 0)
  .set('minutes', 0)
  .set('seconds', 0)
  .set('milliseconds', 0);

const getMonthlyImpactBreakdown = (transactions: ITransactionDocument[], ratings: [number, number][]) => {
  let date = dayjs().utc();
  const dateFormat = 'MM-YYYY';
  const monthlyBreakdown: IUserImpactMonthData[] = [];
  const allMonthlyTransactions: { month: dayjs.Dayjs, transactions: ITransactionDocument[] }[] = [];

  for (const transaction of transactions) {
    const transactionsDate = dayjs(transaction.date);
    while (transactionsDate.format(dateFormat) !== date.format(dateFormat)) {
      date = date.subtract(1, 'month');
      allMonthlyTransactions.push({ month: getMonthStartDate(date), transactions: [] });
    }

    if (!allMonthlyTransactions[allMonthlyTransactions.length - 1]?.transactions) {
      allMonthlyTransactions.push({ month: getMonthStartDate(date), transactions: [] });
    }

    allMonthlyTransactions[allMonthlyTransactions.length - 1].transactions.push(transaction);
  }

  for (const monthlyTransactions of allMonthlyTransactions) {
    const summary = getImpactSummary(monthlyTransactions.transactions);
    const impactScores = getImpactScores(summary, ratings);

    monthlyBreakdown.push({
      ...impactScores,
      date: monthlyTransactions.month.toDate(),
      transactionCount: monthlyTransactions.transactions.length,
    });
  }

  return monthlyBreakdown;
};

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

      _monthlyBreakdownCounts[dayjs(monthBreakdown.date).format(dateFormat)] += 1;
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

  return {
    summary: {
      scores: Object.entries(_summaryScores).map(([score, amount]) => ({ score: parseFloat(score), amount })),
      total: _scoresTotal,
    },
    totalScores: impactScores,
    monthlyBreakdown: _monthlyBreakdown,
    totalTransactions: _totalTransactions,
  };
};

const getTransactions = (userId: Types.ObjectId) => TransactionModel
  .aggregate([
    {
      $match: {
        user: userId,
        company: { $ne: null },
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
