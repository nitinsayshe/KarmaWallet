import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import dayjs, { Dayjs } from 'dayjs';
import { CardModel, ICardDocument } from '../../models/card';
import { IGroup } from '../../models/group';
import { IUser } from '../../models/user';
import { IUserGroupDocument, UserGroupModel } from '../../models/userGroup';

interface IData {
  userGroup: IUserGroupDocument;
  card: ICardDocument;
}

interface IReportData {
  userName: string;
  groupName: string;
  dateUserJoinedGroup: Dayjs;
  dateFirstCardLinked: Dayjs;
  numDaysBetween: number;
}

export const getGroupmMembersWithCards = async () => {
  try {
    const userGroups = await UserGroupModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      }, {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      }, {
        $lookup: {
          from: 'groups',
          localField: 'group',
          foreignField: '_id',
          as: 'group',
        },
      }, {
        $unwind: {
          path: '$group',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    const uniqueGroupMemberIds = Array.from(new Set(userGroups.map(u => u.user._id.toString())));

    const cards = await CardModel
      .find({ userId: { $in: uniqueGroupMemberIds } })
      .sort({
        userId: -1,
        createdOn: 1,
      });

    const data: IData[] = [];

    for (const userGroup of userGroups) {
      // get the first card linked (sorted by date in query above);
      const card: ICardDocument = cards.find(c => c.userId.toString() === userGroup.user._id.toString() && dayjs(userGroup.joinedOn).isBefore(c.createdOn));

      if (!!card) data.push({ userGroup, card });
    }

    const reportData: IReportData[] = [];
    for (const { userGroup, card } of data) {
      const userName = (userGroup.user as IUser).name;
      const groupName = (userGroup.group as IGroup).name;
      const dateUserJoinedGroup = dayjs(userGroup.joinedOn);
      const dateFirstCardLinked = dayjs(card.createdOn);

      const numDaysBetween = dayjs(dateFirstCardLinked).diff(dateUserJoinedGroup, 'days');

      reportData.push({
        userName,
        groupName,
        dateUserJoinedGroup,
        dateFirstCardLinked,
        numDaysBetween,
      });
    }

    const _csv = parse(reportData);
    fs.writeFileSync(path.join(__dirname, '.tmp', 'group_members_with_card.csv'), _csv);
  } catch (err) {
    console.log('[-] error getting group members with cards');
    console.log(err);
  }
};
