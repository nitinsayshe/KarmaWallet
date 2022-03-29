import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery, ObjectId } from 'mongoose';
import { mockRequest } from '../lib/constants/request';
import { asCustomError } from '../lib/customError';
import { GroupModel, GroupStatus } from '../models/group';
import { StatementModel } from '../models/groupStatement';
import { ITransaction, ITransactionDocument } from '../models/transaction';
import { IUserDocument, UserModel } from '../models/user';
import { getGroupMembers } from '../services/groups';
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
  .set('millisecond', 0);

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

export const exec = async () => {
  try {
    const appUser = await UserModel.findOne({ _id: '6241e2260c9177f79772fdc5' });
    const groups = await GroupModel.find({
      $and: [
        { 'settings.matching.enabled': true },
        { status: { $ne: GroupStatus.Deleted } },
      ],
    });

    const [yearStart, monthStart, monthEnd] = getStartAndEndDates();

    for (const group of groups) {
      // get list of all member ids
      const memberMockRequest = { ...mockRequest, requestor: appUser };
      memberMockRequest.params = { groupId: group._id.toString() };
      const members = await getGroupMembers(memberMockRequest);
      const memberIds: string[] = members.map(m => (m.user as IUserDocument)._id);

      const offsetTransactionQuery: FilterQuery<ITransaction> = {
        $and: [
          { userId: { $in: memberIds } },
          { date: { $gte: !!group.settings.matching.maxDollarAmount ? yearStart.toDate() : monthStart.toDate() } },
          { date: { $lte: monthEnd.toDate() } },
        ],
      };

      const statementTransactions = await getOffsetTransactions(offsetTransactionQuery);
      const memberDonationsTotalDollars = await getOffsetTransactionsTotal(offsetTransactionQuery);
      const memberDonationsTotalTonnes = await getRareOffsetAmount(offsetTransactionQuery);

      // will hold a breakdown of values to be matched
      // for each transaction.
      const toBeMatched: IToBeMatched[] = [];

      let totalDollarsToMatch = 0;

      if (!!group.settings.matching.maxDollarAmount) {
        const offsetsPerUser: {[key: string]: IUserOffsets} = {};

        for (const transaction of statementTransactions) {
          if (!offsetsPerUser[transaction.userId.toString()]) {
            offsetsPerUser[transaction.userId.toString()] = {
              matched: 0,
              unmatched: 0,
            };
          }

          let matchedAmount = 0;
          let unmatchedAmount = 0;

          if (!!transaction.matched?.status) {
            matchedAmount = offsetsPerUser[transaction.userId.toString()].matched;
            unmatchedAmount = transaction.amount - matchedAmount;
          } else {
            unmatchedAmount = transaction.amount;
          }

          offsetsPerUser[transaction.userId.toString()].matched += matchedAmount;
          offsetsPerUser[transaction.userId.toString()].unmatched += unmatchedAmount;
        }

        const thisMonthsTransactions = statementTransactions.filter(t => monthStart.isBefore(t.date));

        for (const transaction of thisMonthsTransactions) {
          const userOffsets = offsetsPerUser[transaction.userId.toString()];

          // if user has already been matched 100%, skip this transaction
          if (userOffsets.matched >= group.settings.matching.maxDollarAmount) continue;

          // get remaining balance to be matched for this user
          const leftToBeMatched = (group.settings.matching.maxDollarAmount as number) - userOffsets.matched;

          // if this transaction is greater than the amount left
          // to be matched for this user, only add the amount left
          // otherwise, add the entire transaction amount to the
          // total.
          const value = transaction.amount >= leftToBeMatched
            ? leftToBeMatched
            : transaction.amount;

          totalDollarsToMatch += value;
          toBeMatched.push({ value, transaction });
        }
      } else {
        // matching 100% with no max...getting total for all offsets for the month
        totalDollarsToMatch = statementTransactions.reduce((prev, curr) => curr.amount + prev, 0);
      }

      const statement = new StatementModel({
        group,
        offsets: {
          toBeMatched: {
            dollars: totalDollarsToMatch,
            tonnes: 0,
            transactions: toBeMatched,
          },
          totalMemberOffsets: {
            dollars: memberDonationsTotalDollars,
            tonnes: memberDonationsTotalTonnes,
          },
        },
        transactions: statementTransactions,
        date: dayjs().utc().toDate(),
      });

      console.log('>>>>> statement', statement);

      // await statement.save();

      // TODO: send email to owner and superadmins notifying them that a new statement is available
    }
  } catch (err) {
    throw asCustomError(err);
  }
};
