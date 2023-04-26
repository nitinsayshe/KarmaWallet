import isemail from 'isemail';
import dayjs from 'dayjs';
import { FilterQuery } from 'mongoose';
import { ErrorTypes, emailVerificationDays, TokenTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import { IVisitorDocument, VisitorModel } from '../models/visitor';
import { sendAccountCreationReminderEmail } from '../services/email';
import { createVisitorToken } from '../services/token';

export const exec = async () => {
  let emailsSent = 0;
  try {
    const query: FilterQuery<IVisitorDocument> = {
      user: null,
      emailStatus: { $ne: null },
      createdOn: { $lte: dayjs().subtract(15, 'days').endOf('day').toDate() },
      $or: [
        {
          $and: [
            { createdOn: { $gte: dayjs().subtract(5, 'days').startOf('day').toDate() } },
            { createdOn: { $lte: dayjs().subtract(5, 'days').endOf('day').toDate() } },
          ],
        },
        {
          $and: [
            { createdOn: { $gte: dayjs().subtract(15, 'days').startOf('day').toDate() } },
            { createdOn: { $lte: dayjs().subtract(15, 'days').endOf('day').toDate() } },
          ],
        },
      ],
    };

    const visitors = await VisitorModel.find(query);

    if (!visitors || !visitors.length) throw new CustomError('No visitors to nudge.', ErrorTypes.GEN);

    for (const visitor of visitors) {
      const days = emailVerificationDays;
      const { email } = visitor;
      if (!isemail.validate(email, { minDomainAtoms: 2 })) {
        console.log(`[+] Invalid email format for visitor ${visitor._id}: ${email}`);
        continue;
      }

      const token = await createVisitorToken({ visitor, days, type: TokenTypes.Email, resource: { email } });
      const reminderEmail = await sendAccountCreationReminderEmail({ token: token.value, recipientEmail: email, name: 'createAccountEmailReminder', visitor });
      if (!!reminderEmail) emailsSent += 1;
      console.log(`[+] Nudge email sent to visitor ${visitor._id}`);
    }
    console.log(`[+] Nudge emails sent to ${emailsSent} visitors}`);
  } catch (err) {
    console.log('Error nudging visitors to finish account creation', err);
    throw err;
  }
};

export const oneTimeSend = async () => {
  let emailsSent = 0;
  try {
    const query: FilterQuery<IVisitorDocument> = {
      user: null,
      emailStatus: { $ne: null },
      createdOn: { $lte: dayjs().subtract(16, 'days').startOf('day').toDate() },
    };

    const visitors = await VisitorModel.find(query).sort({ createdOn: -1 });
    console.log(`[+] There will be ${visitors.length} emails sent`, visitors[0]);

    if (!visitors || !visitors.length) throw new CustomError('No visitors to nudge.', ErrorTypes.GEN);

    for (const visitor of visitors) {
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
    // console.log(`[+] Nudge emails sent to ${emailsSent} visitors}`);
  } catch (err) {
    console.log('Error nudging visitors to finish account creation', err);
    throw err;
  }
};
