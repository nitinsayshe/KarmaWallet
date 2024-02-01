import fs from 'fs';
import path from 'path';
import { IMarqetaUserStatus, MarqetaCardState } from '../../integrations/marqeta/types';
import { CardModel, ICard } from '../../models/card';
import { IUser, UserModel } from '../../models/user';

export const activeVirtualCards = (cards: ICard[]) => cards.filter(c => c.integrations.marqeta.instrument_type === 'VIRTUAL_PAN' && (c.integrations.marqeta.state === MarqetaCardState.ACTIVE || c.integrations.marqeta.state === MarqetaCardState.LIMITED));

export const activePhysicalCards = (cards: ICard[]) => cards.filter(c => c.integrations.marqeta.instrument_type === 'PHYSICAL_ICC'
    && (c.integrations.marqeta.state !== MarqetaCardState.TERMINATED && c.integrations.marqeta.state !== MarqetaCardState.SUSPENDED));

const userInSuspendedOrClosedState = (user: IUser) => user.integrations.marqeta.status === IMarqetaUserStatus.CLOSED || user.integrations.marqeta.status === IMarqetaUserStatus.SUSPENDED;

export const validateUsersMarqetaCards = async (userId: string) => {
  const marqetaCards = await CardModel.find({
    'integrations.marqeta': { $ne: null },
    userId,
  });

  if (!marqetaCards.length) {
    console.log(`[+] User ${userId} has no Marqeta cards`);
    return 'User has no Marqeta cards';
  }

  if (marqetaCards.length === 1) {
    console.log(`[+] User ${userId} has only 1 Marqeta card`);
    return 'User has only 1 Marqeta card';
  }

  if (marqetaCards.length > 2) {
    const activeVirtual = activeVirtualCards(marqetaCards).length;
    const activePhysical = activePhysicalCards(marqetaCards).length;

    if (activePhysical > 1 && activeVirtual > 1) {
      console.log(`[+] User ${userId} has more than 1 Physical Card and more than 1 Virtual Card`);
      return 'User has more than 1 Physical Card and more than 1 Virtual Card';
    }

    if (activePhysical > 1) {
      console.log(`[+] User ${userId} has more than 1 Physical Card`);
      return 'User has more than 1 Physical Card';
    }

    if (activeVirtual > 1) {
      console.log(`[+] User ${userId} has more than 1 Virtual Card`);
      return 'User has more than 1 Virtual Card';
    }
  }

  if (marqetaCards.length === 2) {
    // check that they have a virutal card and that it is in an active state
    const hasActiveVirtualCard = activeVirtualCards(marqetaCards).length > 0;
    const hasPhysicalCard = activePhysicalCards(marqetaCards).length > 0;
    if (!hasActiveVirtualCard) return 'User has no active Virtual Card';
    if (!hasPhysicalCard) return 'User has no Physical Card';
  }

  return null;
};

export const checkSuspendedClosedUser = async (userId: string) => {
  const cards = await CardModel.find({
    'integrations.marqeta': { $ne: null },
    userId,
  });

  if (!cards.length) {
    console.log(`[+] User ${userId} has no Marqeta cards`);
    return null;
  }

  if (cards.length > 0) {
    const stillActiveCards = cards.filter(c => c.integrations.marqeta.state === MarqetaCardState.ACTIVE);
    if (stillActiveCards.length > 0) {
      console.log(`[+] User ${userId} has active Marqeta cards`);
      return 'Suspended user still has active cards';
    }
  }

  return null;
};

export const validateKarmaCardUsers = async () => {
  const errors = [];

  const usersWithMarqeta = await UserModel.find({
    'integrations.marqeta': { $ne: null },
  });

  console.log(`[+] Found ${usersWithMarqeta.length} users with Marqeta integration`);

  for (const user of usersWithMarqeta) {
    const userId = user._id.toString();
    const { email } = user.emails.find(e => !!e.primary);
    console.log(`[+] Checking User: ${email}`);

    if (!!userInSuspendedOrClosedState(user)) {
      const error = await checkSuspendedClosedUser(userId);
      if (!!error) {
        errors.push({
          user: user._id,
          email,
          error,
        });
      }

      continue;
    }

    const cardError = await validateUsersMarqetaCards(userId);

    if (!!cardError) {
      errors.push({
        user: user._id,
        email,
        error: cardError,
      });
    }

    if (user.integrations?.marqeta?.status !== 'ACTIVE') {
      console.log('///// User not in Active State');
      errors.push({
        user: user._id,
        email,
        error: 'User not in active user state',
      });
    }
  }

  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'karmaCardErrors.json'), JSON.stringify(errors));
};
