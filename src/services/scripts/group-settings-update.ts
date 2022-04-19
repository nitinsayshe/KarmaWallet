import { asCustomError } from '../../lib/customError';
import { GroupModel } from '../../models/group';

export const removeNegativeOneFromMatchingAndPercent = async () => {
  try {
    const groups = await GroupModel.find({});

    for (const group of groups) {
      let changeFound = false;

      if (group.settings.matching?.matchPercentage <= 0) {
        changeFound = true;
        group.settings.matching.matchPercentage = null;
      }

      if (group.settings.matching?.maxDollarAmount <= 0) {
        changeFound = true;
        group.settings.matching.maxDollarAmount = null;
      }

      if (changeFound) await group.save();
    }
  } catch (err) {
    throw asCustomError(err);
  }
};
