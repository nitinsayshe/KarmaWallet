import { createCard } from '../integrations/marqeta/card';
import { getDepositAccount, createDepositAccount } from '../integrations/marqeta/depositAccount';
import { MarqetaCardState } from '../integrations/marqeta/types';
import { IUserDocument } from '../models/user';
import { mapMarqetaCardtoCard } from '../services/card';
import { karmaWalletCardBreakdown } from '../services/karmaCard/utils';

export const { MARQETA_VIRTUAL_CARD_PRODUCT_TOKEN, MARQETA_PHYSICAL_CARD_PRODUCT_TOKEN } = process.env;

export const exec = async (user: IUserDocument) => {
  let virtualCardResponse = null;
  let physicalCardResponse = null;

  if (!user?.integrations?.marqeta?.userToken) {
    console.error('User does not have marqeta integration');
    return;
  }

  const karmaWalletCards = await karmaWalletCardBreakdown(user);
  const karmaWalletDepositAccount = await getDepositAccount(user._id);

  if (karmaWalletCards.virtualCards > 0 && karmaWalletCards.physicalCard > 0) {
    console.error(`User already has karma cards: ${user._id}`);
  }

  // Order virtual card
  if (karmaWalletCards.virtualCards === 0) {
    virtualCardResponse = await createCard({
      userToken: user.integrations.marqeta.userToken,
      cardProductToken: MARQETA_VIRTUAL_CARD_PRODUCT_TOKEN,
    });

    if (!!virtualCardResponse) {
      // virtual card should start out in active state
      virtualCardResponse.state = MarqetaCardState.ACTIVE;
      await mapMarqetaCardtoCard(user._id.toString(), virtualCardResponse); // map physical card
    } else {
      console.log(`[+] Card Creation Error: Error creating virtual card for user with id: ${user._id}`);
    }
  }

  // Order physical card
  if (karmaWalletCards.physicalCard === 0) {
    physicalCardResponse = await createCard({
      userToken: user.integrations.marqeta.userToken,
      cardProductToken: MARQETA_PHYSICAL_CARD_PRODUCT_TOKEN,
    });

    if (!!physicalCardResponse) {
      await mapMarqetaCardtoCard(user._id.toString(), physicalCardResponse); // map physical card
    } else {
      console.log(`[+] Card Creation Error: Error creating physical card for user with id: ${user._id}`);
    }
  }

  // Create new deposit account for active marqeta user
  if (!karmaWalletDepositAccount) {
    await createDepositAccount(user);
    console.log('///// created a deposit account for userId', user._id);
  }
};
