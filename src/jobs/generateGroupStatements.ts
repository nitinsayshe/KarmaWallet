import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery } from 'mongoose';
import { mockRequest } from '../lib/constants/request';
import { asCustomError } from '../lib/customError';
import { GroupModel, GroupStatus } from '../models/group';
import { StatementModel } from '../models/groupStatement';
import { ITransaction } from '../models/transaction';
import { IUserDocument, UserModel } from '../models/user';
import { getGroupMembers } from '../services/groups';
import { getOffsetTransactions, getOffsetTransactionsTotal, getRareOffsetAmount } from '../services/impact/utils/carbon';

dayjs.extend(utc);

export const exec = async () => {
  try {
    const appUser = await UserModel.findOne({ _id: '6241e2260c9177f79772fdc5' });
    const groups = await GroupModel.find({
      $and: [
        { 'settings.matching.enabled': true },
        { status: { $ne: GroupStatus.Deleted } },
      ],
    });

    const monthStart = dayjs()
      .utc()
      .subtract(1, 'month')
      .set('date', 1)
      .set('hour', 0)
      .set('minute', 0)
      .set('second', 0)
      .set('millisecond', 0);

    const monthEnd = dayjs()
      .utc()
      .subtract(1, 'month')
      .set('date', monthStart.daysInMonth())
      .set('hour', 23)
      .set('minute', 59)
      .set('second', 59)
      .set('millisecond', 999);

    for (const group of groups) {
      // get list of all member ids
      const memberMockRequest = { ...mockRequest, requestor: appUser };
      memberMockRequest.params = { groupId: group._id.toString() };
      const members = await getGroupMembers(memberMockRequest);
      const memberIds: string[] = members.map(m => (m.user as IUserDocument)._id);

      const offsetTransactionQuery: FilterQuery<ITransaction> = {
        $and: [
          { userId: { $in: memberIds } },
          { date: { $gte: monthStart.toDate() } },
          { date: { $lte: monthEnd.toDate() } },
        ],
      };

      const statementTransactions = await getOffsetTransactions(offsetTransactionQuery);
      const memberDonationsTotalDollars = await getOffsetTransactionsTotal(offsetTransactionQuery);
      const memberDonationsTotalTonnes = await getRareOffsetAmount(offsetTransactionQuery);

      console.log('memberIds: ', memberIds);
      console.log('offsetTransactions', statementTransactions);
      console.log('memberDonationsTotalDollars', memberDonationsTotalDollars);
      console.log('memberDonationsTotalTonnes', memberDonationsTotalTonnes);
      console.log('>>>>>>>>>>>>>>>>>>>>>>>');

      const statement = new StatementModel({
        group,
        offsets: {
          totalMemberOffsets: {
            dollars: memberDonationsTotalDollars,
            tonnes: memberDonationsTotalTonnes,
          },
        },
        transactions: statementTransactions,
        date: dayjs().utc().toDate(),
      });

      await statement.save();

      // TODO: send email to owner and superadmins notifying them that a new statement is available
    }
  } catch (err) {
    throw asCustomError(err);
  }
};
