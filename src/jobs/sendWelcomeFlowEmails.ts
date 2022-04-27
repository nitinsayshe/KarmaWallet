import { SandboxedJob } from 'bullmq';
import { IUserDocument, UserModel } from '../models/user';
import { JobNames } from '../lib/constants/jobScheduler';
import { CardModel } from '../models/card';
import { getDaysFromPreviousDate } from '../lib/date';
import CustomError, { asCustomError } from '../lib/customError';
import { ErrorTypes } from '../lib/constants';
import { UserGroupModel } from '../models/userGroup';
import * as EmailService from '../services/email';
import { SentEmailModel } from '../models/sentEmail';
import { EmailTemplateConfigs, AWS_SES_LIMIT_PER_SECOND, EmailTemplateKeys } from '../lib/constants/email';
import { sleep } from '../lib/misc';

interface IHandleSendEmailParams {
  daysSinceJoined: number;
  user: IUserDocument;
  groupName?: string;
}

const ensureLastSentEmailIsNotTheSameAsCurrentTemplate = async (user: IUserDocument, templateName: EmailTemplateKeys) => {
  const lastSentEmail = await SentEmailModel.findOne({ user, key: templateName });
  if (lastSentEmail) throw new CustomError(`Email ${templateName} has already been sent for user: ${user?.name} | ${user._id}`, ErrorTypes.INVALID_ARG);
};

const handleSendEmail = async ({ daysSinceJoined, groupName, user }: IHandleSendEmailParams) => {
  // keeping these flat for readability
  if (daysSinceJoined < 5 && !!groupName) {
    const templateName = EmailTemplateConfigs.WelcomeGroup.name;
    ensureLastSentEmailIsNotTheSameAsCurrentTemplate(user, templateName);
    await EmailService.sendWelcomeGroupEmail({ user: user._id, name: user.name, groupName, recipientEmail: user.email });
  }
  if (daysSinceJoined < 5 && !groupName) {
    const templateName = EmailTemplateConfigs.Welcome.name;
    ensureLastSentEmailIsNotTheSameAsCurrentTemplate(user, templateName);
    await EmailService.sendWelcomeEmail({ user: user._id, name: user.name, recipientEmail: user.email });
  }
  if (daysSinceJoined >= 5 && !!groupName) {
    const templateName = EmailTemplateConfigs.WelcomeCCG1.name;
    ensureLastSentEmailIsNotTheSameAsCurrentTemplate(user, templateName);
    await EmailService.sendWelcomeCCG1Email({ user: user._id, name: user.name, groupName, recipientEmail: user.email });
  }
  if (daysSinceJoined >= 5 && !!groupName) {
    const templateName = EmailTemplateConfigs.WelcomeCCG1.name;
    ensureLastSentEmailIsNotTheSameAsCurrentTemplate(user, templateName);
    await EmailService.sendWelcomeCCG1Email({ user: user._id, name: user.name, groupName, recipientEmail: user.email });
  }
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
  /**
   * AWS SES limits the number of emails that can be sent per second.
   * We need to throttle the number of emails sent per second to avoid exceeding the limit.
   * A basic implementation of throttle is to wait for a certain amount of time between each email.
   */
  const appUser = await UserModel.findOne({ _id: process.env?.APP_USER_ID });
  if (!appUser) throw new CustomError('App user not found', ErrorTypes.NOT_FOUND);
  const users = await UserModel.find({});
  let sentEmailsCount = 0;
  for (const user of users) {
    try {
      if (!user.subscribedUpdates) continue;
      const verifiedEmail = user.emails.find(e => e.primary === true && e.status === 'verified');
      if (!verifiedEmail) continue;
      const userCards = await CardModel.find({ userId: user._id });
      if (userCards.length) continue;
      const userGroupsWithMatchingEnabled = await getGroupWithMatchingEnabled(user);
      const groupName = userGroupsWithMatchingEnabled[0]?.group?.[0]?.name;
      const daysSinceJoined = await getDaysFromPreviousDate(user.dateJoined);
      await handleSendEmail({ daysSinceJoined, groupName, user });
      sentEmailsCount += 1;
      if (sentEmailsCount % AWS_SES_LIMIT_PER_SECOND === 0) await sleep(1000);
    } catch (e) {
      throw asCustomError(e);
    }
  }
};

export const onComplete = () => {
  console.log(`${JobNames.SendWelcomeFlowEmails} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.SendWelcomeFlowEmails} failed`);
  console.log(err);
};
