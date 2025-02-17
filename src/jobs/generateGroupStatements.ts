import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery, ObjectId, Types } from 'mongoose';
import { mockRequest } from '../lib/constants/request';
import { GroupModel, GroupStatus } from '../models/group';
import { ITransaction, ITransactionDocument } from '../models/transaction';
import { IUserDocument, UserModel } from '../models/user';
import { StatementModel } from '../models/statement';
import { getAllGroupMembers } from '../services/groups';
import { getOffsetTransactions } from '../services/impact/utils/carbon';
import { IRef } from '../types/model';
import { asCustomError } from '../lib/customError';
import { StatementReportType } from '../lib/constants/jobScheduler';

interface IJobData {
  reportType: StatementReportType;
}

interface IToBeMatched {
  value: number;
  transaction: IRef<ObjectId, ITransactionDocument>;
}

dayjs.extend(utc);

const getStartDate = (d: Dayjs) => d
  .utc()
  .set('date', 1)
  .set('hour', 0)
  .set('minute', 0)
  .set('second', 0)
  .set('millisecond', 1);

const getMonthEnd = (d: Dayjs) => d
  .utc()
  .set('date', d.daysInMonth())
  .set('hour', 23)
  .set('minute', 59)
  .set('second', 59)
  .set('millisecond', 999);

const getStartAndEndDates = () => {
  const yearStart = getStartDate(dayjs()).startOf('year');
  const monthStart = getStartDate(dayjs()).subtract(1, 'month');
  const monthEnd = getMonthEnd(dayjs().subtract(1, 'month'));

  return [yearStart, monthStart, monthEnd];
};

const getMatchedTransactionsValueTotalForUserForYear = async (groupId: Types.ObjectId, userId: Types.ObjectId, date: Date) => {
  const result = await StatementModel.aggregate([
    {
      $match: {
        group: groupId,
        date: { $lt: date },
      },
    }, {
      $project: {
        'offsets.toBeMatched.transactions': 1,
      },
    }, {
      $unwind: {
        path: '$offsets.toBeMatched.transactions',
        includeArrayIndex: 'string',
        preserveNullAndEmptyArrays: true,
      },
    }, {
      $project: {
        transaction: '$offsets.toBeMatched.transactions',
      },
    }, {
      $project: {
        value: '$transaction.value',
        transaction: '$transaction.transaction',
      },
    }, {
      $lookup: {
        from: 'transactions',
        localField: 'transaction',
        foreignField: '_id',
        as: 'transaction',
      },
    }, {
      $match: {
        'transaction.user': userId,
      },
    }, {
      $group: {
        _id: '$transaction.user',
        totalMatched: {
          $sum: '$value',
        },
      },
    },
  ]);
  return result.length ? result[0].totalMatched : 0;
};

export const exec = async (data?: IJobData) => {
  let statementCount = 0;
  try {
    console.log('\ngenerating monthly group offset statements...');

    const appUser = await UserModel.findOne({ _id: process.env.APP_USER_ID });

    const groups = await GroupModel.find({
      $and: [
        { 'settings.matching.enabled': true },
        { status: { $ne: GroupStatus.Deleted } },
        // hardcoded KW group for testing
        // { _id: '6233a60f1fc03e8853a64dc8' },
      ],
    });

    const [yearStart, monthStart, monthEnd] = getStartAndEndDates();

    console.log(`yearStart: ${yearStart.toISOString()}`);
    console.log(`monthStart: ${monthStart.toISOString()}`);
    console.log(`monthEnd: ${monthEnd.toISOString()}`);

    for (const group of groups) {
      if (!!data && !!data.reportType) {
        if (data.reportType === StatementReportType.MonthlyIdempotent) {
          const latestStatement = await StatementModel.findOne({
            group: group._id,
            date: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() },
          });
          if (!!latestStatement?._id) {
            console.error(`statement already exists for ${group.name} for ${monthStart.format('MMMM YYYY')}`);
            continue;
          }
        }
      }
      let toBeMatchedForGroupDollars = 0;
      let toBeMatchedForGroupTonnes = 0;
      const toBeMatchedForGroupTransactions: IToBeMatched[] = [];

      const { maxDollarAmount, matchPercentage } = group.settings.matching;

      const memberMockRequest = { ...mockRequest, requestor: appUser };
      memberMockRequest.params = { groupId: group._id.toString() };

      const members = await getAllGroupMembers(memberMockRequest);
      const memberIds: string[] = members.map(m => (m.user as IUserDocument)._id);
      const getOffsetTransactionQueryBase = (endDate = monthEnd) => {
        const querybase: FilterQuery<ITransaction> = {
          $and: [
            { 'association.group': group._id },
            { date: { $lte: endDate.toDate() } },
            // exclude matches from the statement
            { matchType: { $exists: false } },
          ],
        };
        return querybase;
      };
      // Query for all transactions that are offset transactions for the month
      const monthlyOffsetTransactionQuery = { ...getOffsetTransactionQueryBase() };
      monthlyOffsetTransactionQuery.$and.push({ date: { $gte: monthStart.toDate() } });
      monthlyOffsetTransactionQuery.$and.push({ user: { $in: memberIds } });
      const allMembersMonthOffsetTransactions = await getOffsetTransactions(monthlyOffsetTransactionQuery);
      const allMembersMonthOffsetTransactionDollars = allMembersMonthOffsetTransactions.reduce((acc, t) => acc + t.integrations.rare.subtotal_amt, 0) / 100;
      const allMembersMonthOffsetTransactionTonnes = allMembersMonthOffsetTransactions.reduce((acc, t) => acc + t.integrations.rare.tonnes_amt, 0);

      console.log('allMembersMonthOffsetTransactions:', allMembersMonthOffsetTransactions.length);
      console.log('allMembersMonthOffsetTransactionDollars:', allMembersMonthOffsetTransactionDollars);

      for (const member of members) {
        const memberId = (member.user as IUserDocument)._id.toString();
        console.log(`\nmember: ${(member.user as IUserDocument).name} `);
        const memberMonthlyOffsetTransactions = allMembersMonthOffsetTransactions.filter(t => t.user.toString() === memberId);
        const memberMonthlyOffsetTotalDollars = memberMonthlyOffsetTransactions.reduce((acc, t) => acc + t.integrations.rare.subtotal_amt, 0) / 100;
        const memberMonthlyOffsetTotalDollarsAfterMatchingPercentage = memberMonthlyOffsetTotalDollars * (matchPercentage / 100);

        // YEARLY TRANSACTIONS FOR MATCH LIMIT CHECK
        const memberYearlyOffsetTotalDollars = await getMatchedTransactionsValueTotalForUserForYear(group._id, (member.user as IUserDocument)._id, monthStart.toDate());

        const hasMemberAlreadyDonatedYearlyMax = memberYearlyOffsetTotalDollars >= maxDollarAmount;
        const remainingMatchingBalance = hasMemberAlreadyDonatedYearlyMax ? 0 : maxDollarAmount - memberYearlyOffsetTotalDollars;

        let currentMonthAmountToBeMatchedForMember = 0;

        if (!hasMemberAlreadyDonatedYearlyMax) {
          // if the limit hasn't been reached, calculate the amount to be matched for the month: either the entire amount or a portion
          currentMonthAmountToBeMatchedForMember = memberMonthlyOffsetTotalDollarsAfterMatchingPercentage > remainingMatchingBalance ? remainingMatchingBalance : memberMonthlyOffsetTotalDollarsAfterMatchingPercentage;
        }

        console.log(`yearly offset total: ${memberYearlyOffsetTotalDollars}`);
        console.log(`memberMonthlyOffsetTotalDollars: ${memberMonthlyOffsetTotalDollars}`);
        console.log(`memberMonthlyOffsetTotalDollarsAfterMatchingPercentage: ${memberMonthlyOffsetTotalDollarsAfterMatchingPercentage}`);
        console.log(`currentMonthAmountToBeMatchedForMember: ${currentMonthAmountToBeMatchedForMember}`);

        if (currentMonthAmountToBeMatchedForMember === 0) continue;

        toBeMatchedForGroupDollars += currentMonthAmountToBeMatchedForMember;

        // if the match amount exists then we need to grab the value of the match
        // per transaction and add up the total tonnes that will be matched

        let amountRemainingToBeMatchedForMember = currentMonthAmountToBeMatchedForMember;
        for (const transaction of memberMonthlyOffsetTransactions) {
          const transactionSubtotal = transaction.integrations.rare.subtotal_amt / 100;
          const transactionSubtotalQualifyingForMatch = transactionSubtotal * (matchPercentage / 100);
          const transactionMatchAmount = (transactionSubtotalQualifyingForMatch <= amountRemainingToBeMatchedForMember) ? transactionSubtotalQualifyingForMatch : amountRemainingToBeMatchedForMember;
          console.log({
            transactionSubtotal,
            transactionSubtotalQualifyingForMatch,
            transactionMatchAmount,
          });
          // if the transaction match isn't > 0 then they don't have any remaining balance to match and we can stop
          if (transactionMatchAmount <= 0) break;
          amountRemainingToBeMatchedForMember -= transactionMatchAmount;
          toBeMatchedForGroupTransactions.push({
            value: transactionMatchAmount,
            transaction,
          });
          const matchPercentageOfTransactionSubtotal = transactionMatchAmount / transactionSubtotal;
          const tonnesMatch = matchPercentageOfTransactionSubtotal * transaction.integrations.rare.tonnes_amt;
          toBeMatchedForGroupTonnes += tonnesMatch;
          console.log({ tonnesMatch });
        }
      }

      const result = {
        group: group._id,
        offsets: {
          matchPercentage,
          maxDollarAmount,
          totalMemberOffsets: {
            dollars: allMembersMonthOffsetTransactionDollars,
            tonnes: allMembersMonthOffsetTransactionTonnes,
          },
          toBeMatched: {
            dollars: toBeMatchedForGroupDollars,
            tonnes: toBeMatchedForGroupTonnes,
            transactions: toBeMatchedForGroupTransactions,
          },
        },
        transactions: allMembersMonthOffsetTransactions.map(t => t._id),
        date: monthStart.toDate(),
        createdOn: dayjs().utc().toDate(),
      };
      console.log(result);
      const statement = new StatementModel(result);
      await statement.save();
      statementCount += 1;
    }
    console.log(`[+] ${statementCount} statements generated successfully\n`);
  } catch (err: any) {
    console.log(`\n[-] An error occurred while generating monthly group offset statements. ${statementCount} statement were created before this error occurred.\n`);
    throw asCustomError(err);
  }

  // arr member transactions for group for current month

  // iterate over users with transactions
  // how much company has matched for this user

  // return: member offsets for the MONTH (total tonnes), member offsets for the MONTH to MATCH (may be the same as the month if the threshold hadn't been met), match dollar amount (offset to match * rare offset rate), status
};
