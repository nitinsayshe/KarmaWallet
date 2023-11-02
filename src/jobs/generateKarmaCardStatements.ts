import dayjs from 'dayjs';
import { generateKarmaCardStatement } from '../services/karmaCardStatement';
import { CardModel } from '../models/card';

export const exec = async () => {
  const lastMonth = dayjs().utc().subtract(1, 'month');
  const lastMonthStart = lastMonth.startOf('month');
  const lastMonthEnd = lastMonth.endOf('month');

  const karmaCards = await CardModel.find({
    'integrations.marqeta': { $exists: true },
  });

  const cardholders = karmaCards.map(c => c.userId.toString());
  const noDuplicateCardholders = [...new Set(cardholders)];

  if (!noDuplicateCardholders.length) {
    console.log('[-] No Karma Card cardholders found');
    return;
  }

  for (const cardholder of noDuplicateCardholders) {
    console.log(`[+] Generating statement for user ${cardholder}`);
    await generateKarmaCardStatement(cardholder, lastMonthStart.toString(), lastMonthEnd.toString());
  }
};
