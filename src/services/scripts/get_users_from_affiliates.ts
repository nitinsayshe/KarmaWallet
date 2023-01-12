import path from 'path';
import fs from 'fs';
import { parse } from 'json2csv';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { UserModel } from '../../models/user';
import { CardModel } from '../../models/card';

dayjs.extend(utc);

export const getUsersFromAffiliates = async (allTime?: boolean) => {
  console.log('[+] Generating list of users from affiliates...');

  try {
    let users;
    let count = 0;

    if (allTime) {
      users = await UserModel.find({ 'integrations.shareasale': { $ne: null } });
    } else {
      const lastMonth = dayjs().subtract(1, 'month');
      const endDate = lastMonth.endOf('month');
      const startDate = lastMonth.startOf('month');

      users = await UserModel.find({
        $and: [
          { 'integrations.shareasale': { $ne: null } },
          { dateJoined: { $lte: endDate.toDate() } },
          { dateJoined: { $gte: startDate.toDate() } },
        ],
      });
    }

    const data = [];
    console.log(`[+] Found ${users.length} users.`);

    for (const user of users) {
      count += 1;
      console.log(`[+] Processing user ${count} of ${users.length}...`);
      const { name, _id, dateJoined } = user;
      const hasCard = await CardModel.find({ userId: _id });
      const primaryEmail = user.emails.find(e => !!e.primary);
      const { trackingId } = user.integrations.shareasale;

      const { status } = primaryEmail;
      data.push({
        name,
        _id,
        email: primaryEmail.email,
        status,
        trackingId,
        hasLinkedCard: !!hasCard.length,
        dateJoined,
      });
    }

    console.log(`[+] affilliate leads report generated successfully with ${data.length} users\n`);

    const _csv = parse(data);
    fs.writeFileSync(path.join(__dirname, '.tmp', 'affiliate_leads.csv'), _csv);
    return _csv;
  } catch (err: any) {
    console.log('[!] Error generating affiliate leads report: ', err.message);
  }
};
