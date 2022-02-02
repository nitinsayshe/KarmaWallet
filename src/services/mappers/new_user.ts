import CustomError from '../../lib/customError';
import { LegacyUserModel } from '../../models/legacyUser';
import { UserModel } from '../../models/user';
import { Logger } from '../logger';

/**
 * migrations users to use ObjectIds instead of string
 * ids. will store the old id on the user object as
 * `legacyId`. will also store entire legacy user
 * object in new `legacy_users` collection...just in
 * case.
 *
 * TODO: delete this mapper after migration
 * TODO: delete legacy_user collection once migration is confirmed
 */

export const mapUsersToV3 = async () => {
  console.log('mapping users to v3 structure...');
  const users = await UserModel.find({}).lean();
  let updatedUsers = 0;
  let errors = 0;

  for (const user of users) {
    if (!user.legacyId) { // preventative measure to ensure this mapping only occurrs on a user once.
      try {
        const legacyUser = new LegacyUserModel({ ...user });

        const legacyId = user._id.toString();
        delete user._id;

        const newUser = new UserModel({ ...user });

        newUser.legacyId = legacyId;

        await UserModel.deleteOne({ name: user.name, email: user.email });
        await newUser.save();
        await legacyUser.save();
        updatedUsers += 1;
      } catch (err: any) {
        const error = new CustomError(`[-] Error migrating user: ${user._id} - ${err.message}`);
        console.log(err);
        Logger.error(error);
        errors += 1;
      }
    }
  }

  if (updatedUsers > 0) console.log(`[+] ${updatedUsers}/${users.length} updated successfully\n`);
  if (errors > 0) console.log(`[-] ${errors} errors occurred while updating users. see log for details.`);
};
