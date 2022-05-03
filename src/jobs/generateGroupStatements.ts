import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery, ObjectId } from 'mongoose';
import { mockRequest } from '../lib/constants/request';
import { asCustomError } from '../lib/customError';
import { GroupModel, GroupStatus } from '../models/group';
import { StatementModel } from '../models/statement';
import { ITransaction, ITransactionDocument } from '../models/transaction';
import { IUserDocument, UserModel } from '../models/user';
import { getAllGroupMembers } from '../services/groups';
import { getOffsetTransactions, getOffsetTransactionsTotal, getRareOffsetAmount } from '../services/impact/utils/carbon';
import { IRef } from '../types/model';

dayjs.extend(utc);

interface IToBeMatched {
  value: number;
  transaction: IRef<ObjectId, ITransactionDocument>;
}
interface IUserOffsets {
  matched: number;
  unmatched: number;
}

const getStartDate = (d: Dayjs) => d
  .utc()
  .set('date', 1)
  .set('hour', 0)
  .set('minute', 0)
  .set('second', 0)
  .set('millisecond', 1);

const getStartAndEndDates = () => {
  const yearStart = getStartDate(dayjs()).set('month', 1);
  const monthStart = getStartDate(dayjs()).subtract(1, 'month');
  const monthEnd = dayjs()
    .utc()
    .subtract(1, 'month')
    .set('date', monthStart.daysInMonth())
    .set('hour', 23)
    .set('minute', 59)
    .set('second', 59)
    .set('millisecond', 999);

  return [yearStart, monthStart, monthEnd];
};

const getOffsetsPerMember = (statementTransactions: ITransactionDocument[]) => {
  // will hold total matched and unmatched amounts
  // for every member for this year.
  const offsetsPerMember: {[key: string]: IUserOffsets} = {};

  for (const transaction of statementTransactions) {
    // create default data for this user if doesnt already exist
    if (!offsetsPerMember[transaction.user.toString()]) {
      offsetsPerMember[transaction.user.toString()] = {
        matched: 0,
        unmatched: 0,
      };
    }

    let matchedAmount = 0;
    let unmatchedAmount = 0;

    if (!!transaction.matched?.status) {
      matchedAmount = transaction.matched.amount;
      const diff = transaction.amount - matchedAmount;
      // if diff is greater than 0, means that this transaction
      // was previously only partially matched and there is
      // still a smaller amount left to be matched that
      // needs to be accounted for.
      unmatchedAmount = diff > 0 ? diff : 0;
    } else {
      unmatchedAmount = transaction.amount;
    }

    offsetsPerMember[transaction.user.toString()].matched += matchedAmount;
    offsetsPerMember[transaction.user.toString()].unmatched += unmatchedAmount;
  }

  return offsetsPerMember;
};

export const exec = async () => {
  console.log('\ngenerating monthly group offset statements...');
  let statementCount = 0;

  try {
    const appUser = await UserModel.findOne({ _id: process.env.APP_USER_ID });
    const groups = await GroupModel.find({
      $and: [
        { 'settings.matching.enabled': true },
        { status: { $ne: GroupStatus.Deleted } },
      ],
    });

    const [yearStart, monthStart, monthEnd] = getStartAndEndDates();

    for (const group of groups) {
      const _statement = await StatementModel.findOne({ group, date: monthStart.toDate() });

      // preventative measure to ensure only 1 statement gets
      // created per group, per month
      //
      // multiple statements could be generated if a job fails
      // and retries. in such a case, another statement will
      // not be created for this group and the job will pick
      // up where it left off.
      if (!!_statement) continue;

      // get list of all member ids
      const memberMockRequest = { ...mockRequest, requestor: appUser };
      memberMockRequest.params = { groupId: group._id.toString() };
      const members = await getAllGroupMembers(memberMockRequest);
      const memberIds: string[] = members.map(m => (m.user as IUserDocument)._id);
      const matchPercent = group.settings.matching.matchPercentage / 100;

      const offsetTransactionQuery: FilterQuery<ITransaction> = {
        $and: [
          { userId: { $in: memberIds } },
          { 'association.group': group._id },
          { date: { $gte: !!group.settings.matching.maxDollarAmount ? yearStart.toDate() : monthStart.toDate() } },
          { date: { $lte: monthEnd.toDate() } },
        ],
      };

      const allTransactions = await getOffsetTransactions(offsetTransactionQuery);
      const memberDonationsTotalDollars = await getOffsetTransactionsTotal(offsetTransactionQuery);
      const memberDonationsTotalTonnes = await getRareOffsetAmount(offsetTransactionQuery);

      // will hold a breakdown of values to be matched
      // for each transaction.
      const toBeMatched: IToBeMatched[] = [];

      let totalDollarsToMatch = 0;

      if (!!group.settings.matching.maxDollarAmount) {
        const offsetsPerMember = getOffsetsPerMember(allTransactions);

        // get just this month's transactions out of full year worth
        // of transactions
        const thisMonthsTransactions = allTransactions.filter(t => monthStart.isBefore(t.date));

        for (const transaction of thisMonthsTransactions) {
          const userOffsets = offsetsPerMember[transaction.user.toString()];

          // if user has already been matched 100%, skip this transaction
          if (userOffsets.matched >= group.settings.matching.maxDollarAmount) continue;

          // get remaining balance to be matched for this user
          const leftToBeMatched = group.settings.matching.maxDollarAmount - userOffsets.matched;

          // if this transaction is greater than the amount left
          // to be matched for this user, only add the amount left
          // otherwise, add the entire transaction amount to the
          // total.
          let value = transaction.amount >= leftToBeMatched
            ? leftToBeMatched
            : transaction.amount;

          value *= matchPercent;

          totalDollarsToMatch += value;
          toBeMatched.push({ value, transaction });
        }
      } else {
        // matching 100% with no max...getting total for all offsets for the month
        totalDollarsToMatch = allTransactions.reduce((prev, curr) => (curr.amount * matchPercent) + prev, 0);
      }

      const toBeMatchedTransactions = !!toBeMatched.length
        ? toBeMatched
        : allTransactions.map(t => ({
          value: t.amount * matchPercent,
          transaction: t,
        }));

      let toBeMatchedTonnes = 0;
      for (const toBeMatchedTransaction of toBeMatchedTransactions) {
        toBeMatchedTonnes += (toBeMatchedTransaction.transaction as ITransactionDocument).integrations.rare.tonnes_amt;
      }
      toBeMatchedTonnes *= matchPercent;

      const statement = new StatementModel({
        group,
        offsets: {
          matchPercentage: group.settings.matching.matchPercentage,
          maxDollarAmount: group.settings.matching.maxDollarAmount,
          toBeMatched: {
            dollars: totalDollarsToMatch,
            tonnes: toBeMatchedTonnes,
            transactions: toBeMatchedTransactions,
          },
          totalMemberOffsets: {
            dollars: memberDonationsTotalDollars,
            tonnes: memberDonationsTotalTonnes,
          },
        },
        transactions: allTransactions.filter(t => monthStart.isBefore(t.date)),
        date: monthStart.toDate(),
        createdOn: dayjs().utc().toDate(),
      });

      await statement.save();
      statementCount += 1;

      // TODO: send email to owner and superadmins notifying them that a new statement is available
    }

    console.log(`[+] ${statementCount} statements generated successfully\n`);
  } catch (err) {
    console.log(`\n[-] An error occurred while generating monthly group offset statements. ${statementCount} statement were created before this error occurred.\n`);
    throw asCustomError(err);
  }
};
