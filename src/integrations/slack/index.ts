import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { SlackClient } from '../../clients/slack';
import { SlackChannelNameEnum } from '../../lib/constants';
import { IUserDocument } from '../../models/user';

dayjs.extend(utc);

export const SlackAlertSourceEnum = {
  ACHTransfer: 'ach transfer',
  DirectDeposit: 'direct deposit',
} as const;
export type SlackAlertSourceEnumValues = typeof SlackAlertSourceEnum[keyof typeof SlackAlertSourceEnum];

export const SlackTransactionAlertTypeEnum = {
  depositedFiveHundredOrMoreWithinTheFirstWeek: 'depositedMoreThanFiveHundredWithinTheFirstWeek',
  withdrewFiveHundredOrMoreWithinTheFirstWeek: 'withdrewMoreThanFiveHundredWithinTheFirstWeek',
  depositedTwentyFiveHundredOrMoreWithinTheFirstMonth: 'depositedMoreThanTwentyFiveHundredWithinTheFirstMonth',
  withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth: 'withdrewMoreThanTwentyFiveHundredWithinTheFirstMonth',
} as const;
export type SlackTransactionAlertTypeEnumValues = typeof SlackTransactionAlertTypeEnum[keyof typeof SlackTransactionAlertTypeEnum];

const getSlackWarningMessage = (message: string) => `:warning: ${message}`;

export const SlackAlertMesageBody = {
  [SlackTransactionAlertTypeEnum.depositedFiveHundredOrMoreWithinTheFirstWeek]: (source: SlackAlertSourceEnumValues, user: IUserDocument, amount: number, daysSinceUserJoined: number) => getSlackWarningMessage(`${SlackTransactionAlertTypeEnum.depositedFiveHundredOrMoreWithinTheFirstWeek} :: ${source} :: user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just completed an ACH transfer depositing $${amount} within ${daysSinceUserJoined} days of joining.`),
  [SlackTransactionAlertTypeEnum.withdrewFiveHundredOrMoreWithinTheFirstWeek]: (source: SlackAlertSourceEnumValues, user: IUserDocument, amount: number, daysSinceUserJoined: number) => getSlackWarningMessage(`${SlackTransactionAlertTypeEnum.withdrewFiveHundredOrMoreWithinTheFirstWeek} :: ${source} :: user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just completed an ACH transfer withrawing $${amount} within ${daysSinceUserJoined} days of joining.`),
  [SlackTransactionAlertTypeEnum.depositedTwentyFiveHundredOrMoreWithinTheFirstMonth]: (source: SlackAlertSourceEnumValues, user: IUserDocument, amount: number, daysSinceUserJoined: number) => getSlackWarningMessage(`${SlackTransactionAlertTypeEnum.depositedTwentyFiveHundredOrMoreWithinTheFirstMonth} :: ${source} :: user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just completed an ACH transfer depositing $${amount} within ${daysSinceUserJoined} days of joining.`),
  [SlackTransactionAlertTypeEnum.withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth]: (source: SlackAlertSourceEnumValues, user: IUserDocument, amount: number, daysSinceUserJoined: number) => getSlackWarningMessage(`${SlackTransactionAlertTypeEnum.withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth} :: ${source} :: user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just completed an ACH transfer withrawing $${amount} within ${daysSinceUserJoined} days of joining.`),
} as const;

export const depositedAmountWithinTimeFrame = (transferAmount: number, daysSinceUserJoined: number, amount: number, days: number) => {
  if (transferAmount < amount) return false;
  return daysSinceUserJoined <= days;
};

export const withdrewAmountWithinTimeFrame = (transferAmount: number, daysSinceUserJoined: number, amount: number, days: number) => {
  if (transferAmount > amount) return false;
  return daysSinceUserJoined <= days;
};

export const depositedTwentyFiveHundredOrMoreWithinTheFirstMonth = (transferAmount: number, daysSinceUserJoined: number) => depositedAmountWithinTimeFrame(transferAmount, daysSinceUserJoined, 2500, 30);
export const withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth = (transferAmount: number, daysSinceUserJoined: number) => withdrewAmountWithinTimeFrame(transferAmount, daysSinceUserJoined, -2500, 30);
export const depositedFiveHundredOrMoreWithinTheFirstWeek = (transferAmount: number, daysSinceUserJoined: number) => depositedAmountWithinTimeFrame(transferAmount, daysSinceUserJoined, 500, 7);
export const withdrewFiveHundredOrMoreWithinTheFirstWeek = (transferAmount: number, daysSinceUserJoined: number) => withdrewAmountWithinTimeFrame(transferAmount, daysSinceUserJoined, -500, 7);

export const getSlackChannelId = async (channelName: string) => {
  const channels = await SlackClient.conversations.list();
  return channels.channels.find((channel) => channel.name === channelName)?.id;
};

export const getTransactionAlertChannelIdFromEnvironment = async () => {
  if (process.env.NODE_ENV === 'production') {
    return getSlackChannelId(SlackChannelNameEnum.ProdTransactionAlerts);
  }
  if (process.env.NODE_ENV === 'staging') {
    return getSlackChannelId(SlackChannelNameEnum.StagingTransactionAlerts);
  }
  console.log(`Not logging transaction alert in this environment: ${process.env.NODE_ENV}`);
  return null;
};

export const sendTransactionAlertMessage = async (message: string) => {
  const channelId = await getTransactionAlertChannelIdFromEnvironment();
  if (!channelId) {
    return;
  }
  await SlackClient.chat.postMessage({
    channel: channelId,
    text: message,
  });
};

export const sendSlackTransferAlert = async (type: SlackAlertSourceEnumValues, transactionType: 'deposit' | 'withdrawal', user: IUserDocument, amount: number) => {
  const dateJoined = dayjs(user.integrations.marqeta.created_time).utc();
  const currentDate = dayjs().utc();
  const daysSinceUserJoined = currentDate.diff(dateJoined, 'days');

  if (transactionType === 'withdrawal') {
    amount = -Math.abs(amount);
  }

  if (depositedFiveHundredOrMoreWithinTheFirstWeek(amount, daysSinceUserJoined)) {
    await sendTransactionAlertMessage(SlackAlertMesageBody[SlackTransactionAlertTypeEnum.depositedFiveHundredOrMoreWithinTheFirstWeek](type, user, amount, daysSinceUserJoined));
  }
  if (withdrewFiveHundredOrMoreWithinTheFirstWeek(amount, daysSinceUserJoined)) {
    await sendTransactionAlertMessage(SlackAlertMesageBody[SlackTransactionAlertTypeEnum.withdrewFiveHundredOrMoreWithinTheFirstWeek](type, user, amount, daysSinceUserJoined));
  }
  if (depositedTwentyFiveHundredOrMoreWithinTheFirstMonth(amount, daysSinceUserJoined)) {
    await sendTransactionAlertMessage(SlackAlertMesageBody[SlackTransactionAlertTypeEnum.depositedTwentyFiveHundredOrMoreWithinTheFirstMonth](type, user, amount, daysSinceUserJoined));
  }
  if (withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth(amount, daysSinceUserJoined)) {
    await sendTransactionAlertMessage(SlackAlertMesageBody[SlackTransactionAlertTypeEnum.withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth](type, user, amount, daysSinceUserJoined));
  }
};
