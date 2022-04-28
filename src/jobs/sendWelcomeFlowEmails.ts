import { SandboxedJob } from 'bullmq';
import { IUserDocument } from '../models/user';
import { JobNames } from '../lib/constants/jobScheduler';
import { getCards } from '../services/card';
import { getDaysFromPreviousDate } from '../lib/date';
import CustomError from '../lib/customError';
import { ErrorTypes } from '../lib/constants';
import { UserGroupModel } from '../models/userGroup';
import * as EmailService from '../services/email';
import { SentEmailModel } from '../models/sentEmail';
import { EmailTemplateConfigs, EmailTemplateKeys } from '../lib/constants/email';
import { INextJob } from '../clients/bull/base';
import { getUsers, getUser } from '../services/user';
import { IRequest } from '../types/request';

interface IHandleSendEmailParams {
  daysSinceJoined: number;
  user: IUserDocument;
  groupName?: string;
  recipientEmail: string;
}

const ensureLastSentEmailIsNotTheSameAsCurrentTemplate = async (user: IUserDocument, templateName: EmailTemplateKeys) => {
  const lastSentEmail = await SentEmailModel.findOne({ user, key: templateName });
  if (lastSentEmail) throw new CustomError(`Email ${templateName} has already been sent for user: ${user?.name} | ${user._id}`, ErrorTypes.INVALID_ARG);
};

const handleSendEmail = async ({ daysSinceJoined, groupName, user, recipientEmail }: IHandleSendEmailParams) => {
  // keeping these flat for readability
  if (daysSinceJoined < 5 && !!groupName) {
    const templateName = EmailTemplateConfigs.WelcomeGroup.name;
    ensureLastSentEmailIsNotTheSameAsCurrentTemplate(user, templateName);
    return EmailService.sendWelcomeGroupEmail({ user: user._id, name: user.name, groupName, recipientEmail, sendEmail: false });
  }
  if (daysSinceJoined < 5 && !groupName) {
    const templateName = EmailTemplateConfigs.Welcome.name;
    ensureLastSentEmailIsNotTheSameAsCurrentTemplate(user, templateName);
    return EmailService.sendWelcomeEmail({ user: user._id, name: user.name, recipientEmail, sendEmail: false });
  }
  if (daysSinceJoined >= 5 && !!groupName) {
    const templateName = EmailTemplateConfigs.WelcomeCCG1.name;
    ensureLastSentEmailIsNotTheSameAsCurrentTemplate(user, templateName);
    return EmailService.sendWelcomeCCG1Email({ user: user._id, name: user.name, groupName, recipientEmail, sendEmail: false });
  }
  if (daysSinceJoined >= 5 && !!groupName) {
    const templateName = EmailTemplateConfigs.WelcomeCCG1.name;
    ensureLastSentEmailIsNotTheSameAsCurrentTemplate(user, templateName);
    return EmailService.sendWelcomeCCG1Email({ user: user._id, name: user.name, groupName, recipientEmail, sendEmail: false });
  }
  return null;
};

const getGroupWithMatchingEnabled = async (user: IUserDocument) => UserGroupModel.aggregate([{
  $match: {
    user: user._id,
  },
}, {
  $lookup: {
    from: 'groups',
    localField: 'group',
    foreignField: '_id',
    as: 'group',
  },
}, {
  $match: {
    'group.settings.matching.enabled': true,
  },
}]);

export const exec = async () => {
  const appUser = await getUser({} as IRequest, { _id: process.env?.APP_USER_ID });
  if (!appUser) throw new CustomError('App user not found', ErrorTypes.NOT_FOUND);
  const users = await getUsers({} as IRequest, {});
  const nextJobs: INextJob[] = [];
  for (const user of users) {
    try {
      if (!user.subscribedUpdates) continue;
      const verifiedEmail = user.emails.find(e => e.primary === true && e.status === 'verified');
      if (!verifiedEmail) continue;
      const userCards = await getCards({} as IRequest, { userId: user._id });
      if (userCards.length) continue;
      const userGroupsWithMatchingEnabled = await getGroupWithMatchingEnabled(user);
      const groupName = userGroupsWithMatchingEnabled[0]?.group?.[0]?.name;
      const daysSinceJoined = await getDaysFromPreviousDate(user.dateJoined);
      const nextJob = await handleSendEmail({ daysSinceJoined, groupName, user, recipientEmail: verifiedEmail?.email });
      if (!nextJob) continue;
      nextJobs.push({ name: JobNames.SendEmail, data: nextJob.jobData, options: nextJob.jobOptions });
    } catch (e) {
      console.log(`Error sending welcome flow email for user: ${user?.name} | ${user?._id}`);
      console.log(e.message);
      console.log('\n');
    }
  }
  return { data: `Scheduling ${nextJobs.length} emails.`, nextJobs };
};

export const onComplete = () => {
  console.log(`${JobNames.SendWelcomeFlowEmails} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.SendWelcomeFlowEmails} failed`);
  console.log(err);
};
