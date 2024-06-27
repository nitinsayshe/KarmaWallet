import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { Types } from 'mongoose';
import { IMarqetaUserStatus, IACHTransferTypes } from '../../integrations/marqeta/types';
import { ACHTransferModel } from '../../models/achTransfer';
import { CardModel, ICardDocument } from '../../models/card';
import { UserModel, IUserDocument } from '../../models/user';

type UserReport = {
  id?: Types.ObjectId;
  email?: string;
  name?: string;
  phone?: string;
  status?: string;
  dateJoined?: string;
  hasLoadedCard?: boolean
};

type UserReportField = keyof UserReport;

export type KarmaCardUserReportConfig = {
  sinceDate?: Date;
  includeFields?: UserReportField[];
};

export const generateKarmaCardUserReport = async (config: KarmaCardUserReportConfig) => {
  if (!config.includeFields) {
    config.includeFields = ['id', 'email', 'name', 'phone', 'status', 'dateJoined', 'hasLoadedCard'];
  }
  const { includeFields } = config;

  const cardQuery: { 'integrations.marqeta': any, createdOn?: any } = { 'integrations.marqeta': { $exists: true } };
  if (config?.sinceDate) {
    cardQuery.createdOn = { $gte: config.sinceDate };
  }

  console.log('card query', cardQuery);
  const cards = await CardModel.find(cardQuery);
  console.log('found cards', cards.length);
  // get unique user ids
  const userIds = [...new Set(cards.map((card) => card.userId.toString()))];
  console.log('found user ids', userIds.length);
  const users = await UserModel.find({ _id: { $in: userIds } });
  console.log('found users', users.length);

  const userCards: { user: IUserDocument, cards: ICardDocument[] }[] = [];
  users.forEach((user) => {
    const userCardsForUser = cards.filter((card) => card.userId.toString() === user._id.toString());
    userCards.push({ user, cards: userCardsForUser });
  });

  const userReports = [];
  for (const { user, cards: c } of userCards) {
    if (!user?.integrations?.marqeta || user?.integrations?.marqeta?.status !== IMarqetaUserStatus.ACTIVE) {
      console.log('user not active', user._id.toString());
      continue;
    }

    const achTransfers = await ACHTransferModel.find(
      { userId: user._id, type: IACHTransferTypes.PULL },
    );
    console.log('ach transfers', achTransfers.length);
    console.log('creating entry for user: ', user._id.toString(), 'with card count: ', c.length, 'and ach transfer count: ', achTransfers.length);

    let entry = {};
    if (includeFields.includes('id')) {
      entry = { ...entry, id: user._id };
    }
    if (includeFields.includes('email')) {
      entry = { ...entry, email: user.emails?.find((e) => e.primary)?.email || '' };
    }
    if (includeFields.includes('name')) {
      entry = { ...entry, name: `${user.integrations?.marqeta?.first_name} ${user.integrations?.marqeta?.last_name}` };
    }
    if (includeFields.includes('phone')) {
      entry = { ...entry, phone: user.integrations?.marqeta?.phone };
    }
    if (includeFields.includes('status')) {
      entry = { ...entry, status: user.integrations?.marqeta?.status?.toString() };
    }
    if (includeFields.includes('dateJoined')) {
      entry = { ...entry, dateJoined: c?.[0]?.createdOn?.toISOString() };
    }
    if (includeFields.includes('hasLoadedCard')) {
      entry = { ...entry, hasLoadedCard: achTransfers?.length > 0 };
    }
    userReports.push(entry);
  }

  const date = new Date().toISOString().split('T')[0];
  console.log('user reports', userReports.length);
  console.log(userReports);
  const _csv = parse(Object.values(userReports));
  fs.writeFileSync(path.join(__dirname, './.tmp/', `${date}_card_holders_${!!config?.sinceDate ? `_since_${config?.sinceDate}` : ''}.csv`), _csv);
};
