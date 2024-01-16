import { Card } from '../../clients/marqeta/card';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { UserModel } from '../../models/user';
import { mapMarqetaCardtoCard } from '../card';

export const getCardsFromMarqeta = async (userId: string) => {
  const user = await UserModel.findById(userId);
  const { userToken } = user.integrations.marqeta;
  const marqetaClient = await new MarqetaClient();
  const cardClient = await new Card(marqetaClient);
  const usersCards = await cardClient.listCards(userToken);
  for (const card of usersCards.data) {
    await mapMarqetaCardtoCard(userId, card);
  }
};
