<<<<<<< Updated upstream
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ICompanyDocument } from '../../../models/company';
import { MiscModel } from '../../../models/misc';
import { ITransactionDocument } from '../../../models/transaction';
import { IUserImpactMonthData } from '../../../models/userImpactTotals';
import { getCompanyRating } from '../../company/utils';
import { calculateCompanyScore } from '../../scripts/calculate_company_scores';

dayjs.extend(utc);

interface IImpactSummary {
  scores: { [key: string]: number };
  total: number;
}

export const getImpactScores = ({ scores, total }: IImpactSummary, ratings: [number, number][]) => {
  const impactScores = { score: 0, positive: 0, negative: 0, neutral: 0 };

  const _scores = Object.keys(scores)
    .map(s => parseFloat(s));

  for (const score of _scores) {
    const amount = scores[`${score}`];
    const totalPercentage = !total ? 0 : amount / total;
    const rawImpact = totalPercentage * score;
    const rating = getCompanyRating(ratings, score);
    impactScores.score += rawImpact;
    impactScores[rating] += totalPercentage;
  }

  return impactScores;
};

export const getImpactSummary = (transactions: ITransactionDocument[]): IImpactSummary => {
  const scores: { [key: string]: number } = {};
  let total = 0;

  for (const transaction of transactions) {
    const { amount } = transaction;
    const { combinedScore } = transaction.company as ICompanyDocument;

    // exclude companies with a null combined score
    if (typeof combinedScore !== 'number') continue;

    const calculatedCombinedScore = calculateCompanyScore(combinedScore);

    const _combinedScore = `${calculatedCombinedScore}`;

    if (!scores[_combinedScore]) scores[_combinedScore] = 0;

    scores[_combinedScore] += amount;
    total += amount;
  }

  return {
    scores,
    total,
  };
};

export const getMonthStartDate = (date: dayjs.Dayjs) => date
  .set('date', 1)
  .set('hours', 0)
  .set('minutes', 0)
  .set('seconds', 0)
  .set('milliseconds', 0);

export const getMonthlyImpactBreakdown = (transactions: ITransactionDocument[], ratings: [number, number][]) => {
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
      totalAmount: summary.total,
      date: monthlyTransactions.month.toDate(),
      transactionCount: monthlyTransactions.transactions.length,
    });
  }

  return monthlyBreakdown;
};

export const getUserImpactRatings = async (): Promise<[number, number][]> => {
  const RatingKey = 'user-impact-ratings';

  let ratings = await MiscModel.findOne({ key: RatingKey });

  if (!ratings) {
    try {
      ratings = new MiscModel({
        key: RatingKey,
        value: '0-49.999,50-74.999,75-100',
      });

      await ratings.save();
    } catch (err) {
      console.log('\n[-] failed to save user impact ratings.');
      console.log(err);
    }
  }

  return ratings.value
    .split(',')
    .map(val => {
      const [min, max] = val.split('-');
      return [parseInt(min), parseInt(max)];
    });
};
=======
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ICompanyDocument } from '../../../models/company';
import { MiscModel } from '../../../models/misc';
import { ITransactionDocument } from '../../../models/transaction';
import { IUserImpactMonthData } from '../../../models/userImpactTotals';
import { getCompanyRating } from '../../company/utils';
import { calculateCompanyScore } from '../../scripts/calculate_company_scores';

dayjs.extend(utc);

interface IImpactSummary {
  scores: { [key: string]: number };
  total: number;
}

export const getImpactScores = ({ scores, total }: IImpactSummary, ratings: [number, number][]) => {
  const impactScores = { score: 0, positive: 0, negative: 0, neutral: 0 };

  const _scores = Object.keys(scores)
    .map(s => parseFloat(s));

  for (const score of _scores) {
    const amount = scores[`${score}`];
    const totalPercentage = !total ? 0 : amount / total;
    const rawImpact = totalPercentage * score;
    const rating = getCompanyRating(ratings, score);
    impactScores.score += rawImpact;
    impactScores[rating] += totalPercentage;
  }

  return impactScores;
};

export const getImpactSummary = (transactions: ITransactionDocument[]): IImpactSummary => {
  const scores: { [key: string]: number } = {};
  let total = 0;

  for (const transaction of transactions) {
    console.log('transaction company', transaction.company);
    const { amount } = transaction;
    const { combinedScore } = transaction.company as ICompanyDocument;

    // exclude companies with a null combined score
    if (typeof combinedScore !== 'number') continue;

    const calculatedCombinedScore = calculateCompanyScore(combinedScore);

    const _combinedScore = `${calculatedCombinedScore}`;

    if (!scores[_combinedScore]) scores[_combinedScore] = 0;

    scores[_combinedScore] += amount;
    total += amount;
  }

  return {
    scores,
    total,
  };
};

export const getMonthStartDate = (date: dayjs.Dayjs) => date
  .set('date', 1)
  .set('hours', 0)
  .set('minutes', 0)
  .set('seconds', 0)
  .set('milliseconds', 0);

export const getMonthlyImpactBreakdown = (transactions: ITransactionDocument[], ratings: [number, number][]) => {
  let date = dayjs().utc();
  const dateFormat = 'MM-YYYY';
  const monthlyBreakdown: IUserImpactMonthData[] = [];
  const allMonthlyTransactions: { month: dayjs.Dayjs, transactions: ITransactionDocument[] }[] = [];

  for (const transaction of transactions) {
    const transactionsDate = dayjs(transaction.date).utc();
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
      totalAmount: summary.total,
      date: monthlyTransactions.month.toDate(),
      transactionCount: monthlyTransactions.transactions.length,
    });
  }

  return monthlyBreakdown;
};

export const getUserImpactRatings = async (): Promise<[number, number][]> => {
  const RatingKey = 'user-impact-ratings';

  let ratings = await MiscModel.findOne({ key: RatingKey });

  if (!ratings) {
    try {
      ratings = new MiscModel({
        key: RatingKey,
        value: '0-49.999,50-74.999,75-100',
      });

      await ratings.save();
    } catch (err) {
      console.log('\n[-] failed to save user impact ratings.');
      console.log(err);
    }
  }

  return ratings.value
    .split(',')
    .map(val => {
      const [min, max] = val.split('-');
      return [parseInt(min), parseInt(max)];
    });
};
>>>>>>> Stashed changes
