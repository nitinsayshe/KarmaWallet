import fs from 'fs';
import path from 'path';
import { MarqetaCardState } from '../../integrations/marqeta/types';
import { CardModel } from '../../models/card';
import { UserModel } from '../../models/user';

export const validateKarmaCardUsers = async () => {
  const errors = [];

  const usersWithMarqeta = await UserModel.find({
    'integrations.marqeta': { $ne: null },
  });

  console.log(`[+] Found ${usersWithMarqeta.length} users with Marqeta integration`);

  for (const user of usersWithMarqeta) {
    const cards = await CardModel.find({
      'integrations.marqeta': { $ne: null },
      userId: user._id,
    });

    const { email } = user.emails.find(e => !!e.primary);
    console.log(`[+] Checking ${email}`);

    if (cards.length > 0) {
      const validCards = cards.filter(c => c.integrations.marqeta.state !== MarqetaCardState.TERMINATED);
      if (validCards.length > 2) {
        errors.push({
          user: user._id,
          email,
          error: 'User has more than 2 cards',
        });
      }

      if (validCards.length === 1) {
        errors.push({
          user: user._id,
          email,
          error: 'User has 1 card',
        });
      }
    } else {
      errors.push({
        user: user._id,
        email,
        error: 'User Has No Cards',
      });
    }

    if (user.integrations?.marqeta?.status !== 'ACTIVE') {
      console.log('///// User not in Active State');
      errors.push({
        user: user._id,
        email,
        error: 'Employee not in active user state',
      });
    }
  }

  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'karmaCardErrors.json'), JSON.stringify(errors));
};
