import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { UserEmailStatus, UserModel } from '../../models/user';

export const mapUserEmailsToArray = async () => {
  const { APP_USER_ID } = process.env;
  if (!APP_USER_ID) throw new CustomError('AppUserId not found', ErrorTypes.SERVICE);
  const users = await UserModel.find({ });
  for (const user of users) {
    const emails = [];
    emails.push({ email: user.email, status: UserEmailStatus.Verified, primary: true });
    if (user.altEmails.length > 0) {
      user.altEmails.forEach((altEmail) => {
        if (!altEmail?.email) return;
        emails.push({ email: altEmail.email, status: altEmail.status, primary: false });
      });
    }
    user.emails = emails;
    await user.save();
  }
};
