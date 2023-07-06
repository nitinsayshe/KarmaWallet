import { SandboxedJob } from 'bullmq';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CardStatus } from '../lib/constants';
import { JobNames } from '../lib/constants/jobScheduler';
import { ExcludeCategories } from '../lib/constants/plaid';
import { sectorsToExcludeFromTransactions } from '../lib/constants/transaction';
import { asCustomError } from '../lib/customError';
import { roundToPercision } from '../lib/misc';
import { CardModel } from '../models/card';
import { CommissionModel } from '../models/commissions';
import { IAdminSummary, ReportModel } from '../models/report';
import { TransactionModel } from '../models/transaction';
import { UserModel } from '../models/user';
import { UserLogModel } from '../models/userLog';

dayjs.extend(utc);

/**
 * a job to run every two hors to generate a new admin summary report
 */

export const exec = async () => {
  try {
    console.log('generating admin summary report');
    const totalUsersCount = await UserModel.find({}).count();

    const linkedCards = await CardModel.find({
      status: CardStatus.Linked,
    }).count();
    const unlinkedCards = await CardModel.find({
      status: CardStatus.Unlinked,
    }).count();
    const removedCards = await CardModel.find({
      status: CardStatus.Removed,
    }).count();
    const usersWithLinkedCards = await CardModel.aggregate()
      .match({ status: CardStatus.Linked })
      .group({ _id: '$userId' })
      .count('count');

    const usersWithLinkedCardsCount = usersWithLinkedCards && usersWithLinkedCards.length > 0 ? usersWithLinkedCards[0]?.count : 0;

    const usersWithUnlinkedCards = await CardModel.aggregate()
      .match({ status: CardStatus.Unlinked })
      .group({ _id: '$userId' })
      .count('count');

    const usersWithUnlinkedCardsCount = usersWithUnlinkedCards && usersWithUnlinkedCards.length > 0 ? usersWithUnlinkedCards[0]?.count : 0;

    const usersWithRemovedCards = await CardModel.aggregate()
      .match({ status: CardStatus.Removed })
      .group({ _id: '$userId' })
      .count('count');
    const usersWithRemovedCardsCount = usersWithRemovedCards && usersWithRemovedCards.length > 0 ? usersWithRemovedCards[0]?.count : 0;

    const linkeDepositoryCards = await CardModel.find({
      type: 'depository',
      status: CardStatus.Linked,
    }).count();

    /* Total number of transactions captured (count) and total $s (absolute
     * value) for those transactions. */
    const transactionData = await TransactionModel.aggregate()
      .match({
        $and: [{ 'integrations.plaid': { $exists: true } }, { 'integrations.plaid': { $ne: null } }],
      })
      .group({
        _id: null,
        totalAmount: { $sum: { $abs: '$amount' } },
        count: { $sum: 1 },
      });

    const transactionDataExcludingCategories = await TransactionModel.aggregate()
      .match({
        $and: [
          { amount: { $gte: 0 } },
          { 'integrations.plaid.category': { $exists: true } },
          { 'integrations.plaid.category': { $ne: null } },
          { 'integrations.plaid.category': { $nin: ExcludeCategories } },
        ],
      })
      .group({
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      });

    /* Total matched transactions (count and absolute value) */
    const matchedTransactionData = await TransactionModel.aggregate()
      .match({
        $and: [
          { 'integrations.plaid': { $exists: true } },
          { 'integrations.plaid': { $ne: null } },
          { company: { $exists: true } },
          { company: { $ne: null } },
        ],
      })
      .group({
        _id: null,
        totalAmount: { $sum: { $abs: '$amount' } },
        count: { $sum: 1 },
      });

    const matchedTransactionsExcludingCategories = await TransactionModel.aggregate()
      .match({
        $and: [
          { amount: { $gte: 0 } },
          { company: { $exists: true } },
          { company: { $ne: null } },
          { 'integrations.plaid.category': { $exists: true } },
          { 'integrations.plaid.category': { $ne: null } },
          { 'integrations.plaid.category': { $nin: ExcludeCategories } },
        ],
      })
      .group({
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      });

    let totalOffsets: { dollars: number; tonnes: number; count: number }[] = await TransactionModel.aggregate()
      .match({
        $and: [
          { sector: { $nin: sectorsToExcludeFromTransactions } },
          { amount: { $gt: 0 } },
          { reversed: { $ne: true } },
          { 'integrations.rare': { $ne: null } },
        ],
      })
      .group({
        _id: null,
        tonnes: { $sum: '$integrations.rare.tonnes_amt' },
        dollars: { $sum: '$integrations.rare.subtotal_amt' },
        count: { $sum: 1 },
      });

    if (!totalOffsets || totalOffsets.length === 0) {
      totalOffsets = [{ dollars: 0, tonnes: 0, count: 0 }];
    }

    let commissionDollars = 0;
    let totalCommissions = 0;
    const commissions = await CommissionModel.find({}).lean();
    if (!!commissions && commissions.length > 0) {
      commissionDollars = commissions.reduce((partialSum, commission) => partialSum + commission.amount, 0);
      totalCommissions = commissions.length;
    }

    const totalWildfireCommissions = commissions.reduce((partialSum, commission) => {
      if (!!commission?.integrations?.wildfire) {
        return ++partialSum;
      }
      return partialSum;
    }, 0);

    const totalWildfireCommissionDollars = commissions.reduce((partialSum, commission) => {
      if (!!commission?.integrations?.wildfire) {
        return partialSum + commission.amount;
      }
      return partialSum;
    }, 0);

    const totalKardCommissions = commissions.reduce((partialSum, commission) => {
      if (!!commission?.integrations?.kard?.reward?.commissionToIssuer) {
        return ++partialSum;
      }
      return partialSum;
    }, 0);

    const totalKardCommissionDollars = commissions.reduce((partialSum, commission) => {
      if (!!commission?.integrations?.kard?.reward?.commissionToIssuer) {
        return partialSum + commission.amount;
      }
      return partialSum;
    }, 0);

    const totalKarmaWalletCommissions = commissions.reduce((partialSum, commission) => {
      if (!!commission?.integrations?.karma) {
        return ++partialSum;
      }
      return partialSum;
    }, 0);

    const totalKarmaWalletCommissionDollars = commissions.reduce((partialSum, commission) => {
      if (!!commission?.integrations?.karma) {
        return partialSum + commission.amount;
      }
      return partialSum;
    }, 0);

    const loggedInLastSevenDays = await UserLogModel.aggregate()
      .match({
        date: { $gte: dayjs().subtract(7, 'days').utc().toDate() },
      })
      .group({
        _id: '$userId',
      });

    const loggedInLastThirtyDays = await UserLogModel.aggregate()
      .match({
        date: { $gte: dayjs().subtract(30, 'days').utc().toDate() },
      })
      .group({
        _id: '$userId',
      });

    const totalLoginsLastSevenDays = await UserLogModel.find({
      date: { $gte: dayjs().subtract(7, 'days').utc().toDate() },
    }).count();
    const totalLoginsLastThirtyDays = await UserLogModel.find({
      date: { $gte: dayjs().subtract(30, 'days').utc().toDate() },
    }).count();

    const adminSummary: IAdminSummary = {
      users: {
        total: totalUsersCount,
        withCard: usersWithLinkedCardsCount,
        withUnlinkedCard: usersWithUnlinkedCardsCount,
        withRemovedCard: usersWithRemovedCardsCount,
        withoutCard: totalUsersCount - usersWithLinkedCardsCount,
        loggedInLastSevenDays: loggedInLastSevenDays ? loggedInLastSevenDays.length : 0,
        loggedInLastThirtyDays: loggedInLastThirtyDays ? loggedInLastThirtyDays.length : 0,
      },
      cards: {
        linked: {
          total: linkedCards,
          depository: linkeDepositoryCards,
          credit: linkedCards - linkeDepositoryCards,
        },
        unlinked: {
          total: unlinkedCards,
        },
        removed: {
          total: removedCards,
        },
      },
      logins: {
        sevenDayTotal: totalLoginsLastSevenDays,
        thirtyDayTotal: totalLoginsLastThirtyDays,
      },
      transactions: {
        total: !!transactionData[0]?.count ? (transactionData[0].count as number) : 0,
        totalDollars: !!transactionData[0]?.totalAmount
          ? roundToPercision(transactionData[0].totalAmount as number, 0)
          : 0,
        totalDollarsExcludingCategories: !!transactionDataExcludingCategories[0]?.totalAmount
          ? roundToPercision(transactionDataExcludingCategories[0].totalAmount as number, 0)
          : 0,
        totalExcludingCategories: !!transactionDataExcludingCategories[0]?.count
          ? roundToPercision(transactionDataExcludingCategories[0]?.count as number, 0)
          : 0,
        matched: !!matchedTransactionData[0]?.count ? (matchedTransactionData[0]?.count as number) : 0,
        matchedExcludingCategories: !!matchedTransactionsExcludingCategories[0]
          ? (matchedTransactionsExcludingCategories[0]?.count as number)
          : 0,
        matchedDollars: !!matchedTransactionData[0]?.totalAmount
          ? roundToPercision(matchedTransactionData[0]?.totalAmount as number, 0)
          : 0,
        matchedDollarsExcludingCategories: !!matchedTransactionsExcludingCategories[0]?.totalAmount
          ? roundToPercision(matchedTransactionsExcludingCategories[0]?.totalAmount as number, 0)
          : 0,
        matchedRatio: roundToPercision(
          !!matchedTransactionData[0]?.count && !!transactionData[0].count
            ? (((matchedTransactionData[0].count as number) / transactionData[0].count) as number)
            : 0,
          2,
        ),
        matchedRatioExcludingCategories: roundToPercision(
          !!transactionDataExcludingCategories[0]?.count && !!matchedTransactionsExcludingCategories[0]?.count
            ? (((matchedTransactionsExcludingCategories[0].count as number)
                / transactionDataExcludingCategories[0].count) as number)
            : 0,
          2,
        ),
        matchedDollarsRatio: roundToPercision(
          !!matchedTransactionData[0]?.totalAmount && !!transactionData[0]?.totalAmount
            ? (((matchedTransactionData[0].totalAmount as number) / transactionData[0].totalAmount) as number)
            : 0,
          2,
        ),
        matchedDollarsRatioExcludingCategories: roundToPercision(
          !!matchedTransactionsExcludingCategories[0]?.totalAmount
            && !!transactionDataExcludingCategories[0]?.totalAmount
            ? (((matchedTransactionsExcludingCategories[0].totalAmount as number)
                / transactionDataExcludingCategories[0].totalAmount) as number)
            : 0,
          2,
        ),
      },
      offsets: {
        total: totalOffsets[0]?.count,
        dollars: roundToPercision(!!totalOffsets[0]?.dollars ? totalOffsets[0].dollars : 0 / 100, 0),
        tons: totalOffsets[0]?.tonnes ? roundToPercision(totalOffsets[0]?.tonnes, 2) : 0,
      },
      commissions: {
        total: totalCommissions,
        dollars: commissionDollars ? roundToPercision(commissionDollars, 0) : 0,
        totalWildfire: totalWildfireCommissions,
        totalWildfireDollars: totalWildfireCommissionDollars ? roundToPercision(totalWildfireCommissionDollars, 0) : 0,
        totalKarmaWallet: totalKarmaWalletCommissions,
        totalKarmaWalletDollars: totalKarmaWalletCommissionDollars
          ? roundToPercision(totalKarmaWalletCommissionDollars, 0)
          : 0,
        totalKard: totalKardCommissions || 0,
        totalKardDollars: totalKardCommissionDollars ? roundToPercision(totalKardCommissionDollars, 0) : 0,
      },
    };

    await ReportModel.create({ adminSummary });
  } catch (err) {
    console.error(`Error generating admin summary report: ${err}`);
    throw asCustomError(err);
  }
};

export const onComplete = () => {
  console.log(`${JobNames.GenerateAdminSummaryReport} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.GenerateAdminSummaryReport} failed`);
  console.log(err);
};
