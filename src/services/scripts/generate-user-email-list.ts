import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { CardStatus } from '../../lib/constants';
import { CardModel } from '../../models/card';
import { LegacySessionModel } from '../../models/legacySession';
import { UserModel } from '../../models/user';

// "_id","email","name","dateJoined","firstName","lastName","cardsLinked","dateLinked","loginCount","lastLogin"
// "5Jmpn5jxgXTqOMxCqhLxh","nair.anushka99@gmail.com","Anushka Nair","2021-10-15T17:54:02.322Z","Anushka","Nair",0,,23,"2022-04-04T18:37:16.099Z"

interface IParsedUser {
  _id: string;
  email: string;
  name: string;
  dateJoined: Date;
  firstName: string;
  lastName: string;
  cardsLinked: number;
  dateLinked?: Date;
  loginCount: number;
  lastLogin: Date;
}

const splitNameIntoFirstAndLast = (name: string): { firstName: string, lastName: string } => {
  name = name.trim();
  const names = name.split(' ');
  const firstName = names.length < 3 ? names[0] : names.slice(0, names.length - 1).join(' ');
  const lastName = names.length > 1 ? names[names.length - 1] : null;
  return { firstName, lastName };
};

export const generateUserEmailList = async () => {
  console.log('\ngenerating user email report...');
  try {
    const users = await UserModel.find({}).lean();
    const parsedUsers: IParsedUser[] = [];

    for (const user of users) {
      const { firstName, lastName } = splitNameIntoFirstAndLast(user.name);

      const logins = await LegacySessionModel.find({ uid: user.legacyId }).sort({ sessionTime: -1 }).lean();
      const cards = await CardModel.find({ userId: user._id, status: CardStatus.Linked }).lean();

      parsedUsers.push({
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        dateJoined: user.dateJoined,
        firstName,
        lastName,
        cardsLinked: cards.length,
        loginCount: logins.length,
        lastLogin: logins[0]?.sessionTime || null,
      });
    }

    const _csv = parse(parsedUsers);
    fs.writeFileSync(path.join(__dirname, '.tmp', 'user_email_report.csv'), _csv);

    console.log(`[+] user email report generated successfully with ${parsedUsers.length} users\n`);
  } catch (err: any) {
    console.log('[-] error generating user email report');
    console.log(err.message);
  }
};
