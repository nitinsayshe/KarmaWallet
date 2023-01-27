import { CardStatus } from '../../lib/constants';
import { CardModel } from '../../models/card';
import * as UserPlaidTransactionMap from '../../jobs/userPlaidTransactionMap';

export const processNonSyncedCards = async () => {
  const cards = await CardModel.find({ initialTransactionsProcessing: true, status: CardStatus.Linked });
  console.log('cards', cards.length);
  let i = 0;
  for (const card of cards) {
    console.log(`processing card ${i++} of ${cards.length}`);
    await UserPlaidTransactionMap.exec({ userId: card.userId.toString(), accessToken: card.integrations.plaid.accessToken });
  }
};
