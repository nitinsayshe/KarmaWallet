import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Types } from 'mongoose';
import { ICompanyDocument } from '../models/company';
import { ITransactionDocument, TransactionModel } from '../models/transaction';
import { IUserDocument, UserModel } from '../models/user';
import { IUserImpactMonthData, IUserImpactTotalDocument, UserImpactTotalModel } from '../models/userImpactTotals';
import { getUserImpactRatings } from '../services/impact/utils';

dayjs.extend(utc);

/**
 * this file contains all the logic used to calculate
 * user_impact_totals.
 */

interface IImpactSummary {
  summary: { [key: string]: number };
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

const getImpactScores = ({ summary, total }: IImpactSummary, ratings: [number, number][]) => {
  const impactScores = { score: 0, positive: 0, negative: 0, neutral: 0 };

  const _scores = Object.keys(summary)
    .map(s => parseFloat(s));

  for (const score of _scores) {
    const amount = summary[`${score}`];
    const totalPercentage = amount / total;
    const rawImpact = totalPercentage * score;
    const rating = getCompanyRating(ratings, score);
    impactScores.score += rawImpact;
    impactScores[rating] += totalPercentage;
  }
  if (impactScores.score === 0) impactScores.score = null;

  return impactScores;
};

const getImpactSummary = (transactions: ITransactionDocument[]): IImpactSummary => {
  const summary: { [key: string]: number } = {};
  let total = 0;

  for (const transaction of transactions) {
    const { amount } = transaction;
    const { combinedScore } = transaction.company as ICompanyDocument;

    // exclude companies with a null combined score
    if (typeof combinedScore !== 'number') continue;

    const _combinedScore = `${combinedScore}`;

    if (!summary[_combinedScore]) summary[_combinedScore] = 0;

    summary[_combinedScore] += amount;
    total += amount;
  }

  return {
    summary,
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

  try {
    users = await UserModel.find({});
    allImpactTotals = await UserImpactTotalModel.find({});
    ratings = await getUserImpactRatings();
  } catch (err) {
    console.log('[-] error loading users, user impact ratings, and existing user impact totals');
    console.log(err);
  }

  if (!users || !allImpactTotals) return;

  for (const user of users) {
    if (user._id.toString() === process.env.APP_USER_ID) {
      appUser = user;
      continue;
    }

    try {
      const transactions = await getTransactions(user._id);

      if (!transactions.length) continue;

      const monthData = getMonthlyImpactBreakdown(transactions, ratings);

      const summary = getImpactSummary(transactions);
      const impactScores = getImpactScores(summary, ratings);

      console.log(summary);
      console.log(impactScores);
      console.log(monthData);

      // TODO: calculate all users impact score
      // save or update userImpactTotal
      // do we want snapshots of all this data? or will the monthly breakdown suffice?
    } catch (err) {
      console.log(`\n[-] error generating impact total for user: ${user._id}`);
      console.log(err, '\n');
      errorCount += 1;
      continue;
    }
  }

  // TODO: add grand totals to appUser

  const completeMessage = !!errorCount
    ? `[!] generating user impact totals completed with ${errorCount} errors.`
    : `[+] ${users.length} user impact totals generated successfully`;

  console.log(`\n${completeMessage}\n`);
};
