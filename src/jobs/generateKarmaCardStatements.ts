import dayjs from 'dayjs';
import { UserModel } from '../models/user';
import { generateKarmaCardStatement } from '../services/karmaCardStatement';

export const exec = async () => {
  const lastMonth = dayjs().utc().subtract(1, 'month');
  const lastMonthStart = lastMonth.startOf('month');
  const lastMonthEnd = lastMonth.endOf('month');

  const usersWithKarmaCards = await UserModel.find({
    'integrations.marqeta': { $exists: true },
  });

  const cardholders = usersWithKarmaCards.map(u => u._id.toString());

  for (const cardholder of cardholders) {
    console.log(`[+] Generating statement for user ${cardholder}`);
    await generateKarmaCardStatement(cardholder, lastMonthStart.toString(), lastMonthEnd.toString());
  }
};
