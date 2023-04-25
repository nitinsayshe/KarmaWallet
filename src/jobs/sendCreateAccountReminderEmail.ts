import dayjs from 'dayjs';
import isemail from 'isemail';
import { ErrorTypes, emailVerificationDays, TokenTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import { VisitorModel } from '../models/visitor';
import { sendAccountCreationReminderEmail } from '../services/email';
import { createVisitorToken } from '../services/token';

export const exec = async () => {
  let emailsSent = 0;
  try {
    // only visitors who requested an account have an emailStatus
    const visitors = await VisitorModel.find({ user: null, emailStatus: { $ne: null } });
    // const visitors = await VisitorModel.find({
    //   _id: '64428ff6c3a96ef3fbc18d5e',
    // });

    if (!visitors || !visitors.length) throw new CustomError('No visitors to nudge.', ErrorTypes.GEN);

    for (const visitor of visitors) {
      const createdOnDate = dayjs(visitor.createdOn);
      const today = dayjs();
      const difference = today.diff(createdOnDate, 'days');
      if (difference === 5 || difference === 15) {
        const days = emailVerificationDays;
        const { email } = visitor;
        if (!isemail.validate(email, { minDomainAtoms: 2 })) {
          console.log(`[+] Invalid email format for visitor ${visitor._id}: ${email}`);
          continue;
        }

        const token = await createVisitorToken({ visitor, days, type: TokenTypes.Email, resource: { email } });
        const reminderEmail = await sendAccountCreationReminderEmail({ token: token.value, recipientEmail: email, name: 'createAccountEmailReminder', visitor });
        if (!!reminderEmail) emailsSent += 1;
        console.log(`[+] Nudge email sent to visitor ${emailsSent} visitors`);
      }
    }
    console.log(`[+] Nudge emails sent to ${emailsSent} visitors}`);
  } catch (err) {
    console.log('Error nudging visitors to finish account creation', err);
    throw err;
  }
};
