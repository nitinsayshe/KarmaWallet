import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery } from 'mongoose';
import { mockRequest } from '../lib/constants/request';
import { GroupModel, GroupStatus } from '../models/group';
import { ITransaction } from '../models/transaction';
import { IUserDocument, UserModel } from '../models/user';
import { getAllGroupMembers } from '../services/groups';
import { getOffsetTransactions } from '../services/impact/utils/carbon';

dayjs.extend(utc);

const getStartDate = (d: Dayjs) => d
  .utc()
  .set('date', 1)
  .set('hour', 0)
  .set('minute', 0)
  .set('second', 0)
  .set('millisecond', 1);

const getStartAndEndDates = () => {
  const yearStart = getStartDate(dayjs()).set('month', 0);
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

export const exec = async () => {
  try {
    const appUser = await UserModel.findOne({ _id: process.env.APP_USER_ID });

    const groups = await GroupModel.find({
      $and: [
        { 'settings.matching.enabled': true },
        { status: { $ne: GroupStatus.Deleted } },
        { _id: '6233a60f1fc03e8853a64dc8' },
      ],
    });

    const [yearStart, monthStart, monthEnd] = getStartAndEndDates();

    for (const group of groups) {
      const toBeMatchedForGroup = 0;
      let { maxDollarAmount, matchPercentage } = group.settings.matching;
      maxDollarAmount = 5;
      matchPercentage = matchPercentage || 0;

      const memberMockRequest = { ...mockRequest, requestor: appUser };
      memberMockRequest.params = { groupId: group._id.toString() };

      const members = await getAllGroupMembers(memberMockRequest);

      const memberIds: string[] = members.map(m => (m.user as IUserDocument)._id);

      const getOffsetTransactionQueryBase = () => {
        const querybase: FilterQuery<ITransaction> = {
          $and: [
            { 'association.group': group._id },
            { date: { $lte: monthEnd.toDate() } },
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
      const allMembersMonthOffsetTotalTonnes = allMembersMonthOffsetTransactions.reduce((acc, t) => acc + t.integrations.rare.tonnes_amt, 0);

      for (const member of members) {
        const memberId = (member.user as IUserDocument)._id.toString();
        const memberMonthlyOffsetTransactions = allMembersMonthOffsetTransactions.filter(t => t.user.toString() === memberId);
        const memberMonthlyOffsetTotalDollars = memberMonthlyOffsetTransactions.reduce((acc, t) => acc + t.integrations.rare.subtotal_amt, 0) / 100;
        const memberMonthlyOffsetTotalTonnes = memberMonthlyOffsetTransactions.reduce((acc, t) => acc + t.integrations.rare.tonnes_amt, 0);

        // YEARLY TRANSACTIONS FOR MATCH LIMIT CHECK
        const yearlyOffsetTransactionQuery = { ...getOffsetTransactionQueryBase() };
        yearlyOffsetTransactionQuery.$and.push({ date: { $gte: yearStart.toDate() } });
        yearlyOffsetTransactionQuery.$and.push({ user: memberId });
        const yearlyOffsetTransactions = await getOffsetTransactions(yearlyOffsetTransactionQuery);

        const memberYearlyOffsetTotalDollars = yearlyOffsetTransactions.reduce((acc, t) => acc + t.integrations.rare.subtotal_amt / 100, 0);
        const memberHitLimit = memberYearlyOffsetTotalDollars >= maxDollarAmount;
        let amountToBeMatchedForMember = 0;

        if (!memberHitLimit) amountToBeMatchedForMember = memberMonthlyOffsetTotalDollars;
        else {
          const remainingDollars = maxDollarAmount - memberYearlyOffsetTotalDollars - memberMonthlyOffsetTotalDollars;
          console.log({ remainingDollars });
        }
        console.log({ memberId, amountToBeMatchedForMember });
      }

      console.log({
        group: group._id,
        offsets: {
          matchPercentage,
          maxDollarAmount,
        },
        toBeMatched: null,
        matched: null,
        transactions: allMembersMonthOffsetTransactions.map(t => t._id),
        date: monthStart.toDate(),
        createdOn: dayjs().utc().toDate(),
      });
    }
  } catch (e) {
    // log it
  }

  // arr member transactions for group for current month

  // iterate over users with transactions
  // how much company has matched for this user

  // return: member offsets for the MONTH (total tonnes), member offsets for the MONTH to MATCH (may be the same as the month if the threshold hadn't been met), match dollar amount (offset to match * rare offset rate), status
};

/*
{
  group,
  offsets: {
    matchPercentage,
    maxDollarAmount,
    toBeMatched: {
      dollars,
      tonnes,
      transactions: [
        {
          value,
          transaction,
        }
      ],
    },
    matched: {
      dollars,
      tonnes,
      transactor: {
        user,
        group,
      },
      date,
  },
  transactions,
  date,
  createdOn,
}
*/
