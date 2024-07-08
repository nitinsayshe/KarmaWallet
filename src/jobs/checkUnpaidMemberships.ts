import dayjs from 'dayjs';
import { UserModel } from '../models/user';
import { KarmaMembershipStatusEnum } from '../models/user/types';
import { sendPayMembershipReminderEmail } from '../services/email';

export const exec = async () => {
  let emailsSent = 0;
  try {
    const users = await UserModel.find({
      'karmaMembership.status': KarmaMembershipStatusEnum.unpaid,
      'karmaMembership.createdOn': {
        $eq: dayjs().subtract(2, 'days').endOf('day').toDate(),
      },
    });

    if (!users || !users.length) {
      console.log('No users to nudge for membership payment.');
    }

    for (const user of users) {
      const userEmail = user.emails.find((email: any) => email.primary)?.email;
      const reminderEmail = await sendPayMembershipReminderEmail({
        link: 'https://karmawallet.io/account',
        recipientEmail: userEmail,
        name: user.integrations.marqeta.first_name,
        user,
      });
      if (!!reminderEmail) emailsSent += 1;
      console.log(`[+] Pay Membership nudge email sent to visitor ${user._id}`);
    }
    console.log(`[+] Pay Membership nudge emails sent to ${emailsSent} visitors}`);
  } catch (err) {
    console.log('Error nudging visitors to finish account creation', err);
    throw err;
  }

  // should we add some logic to do something if a user has not paid their membership after 10 days?
  // we should add different handling if this is a user who had a membership and then did not renew (what do we need to do for this scenario?)
};
