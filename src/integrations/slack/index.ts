import { SlackClient } from '../../clients/slack';
import { SlackChannelNameEnum } from '../../lib/constants';
import { IUserDocument } from '../../models/user';

export const SlackTransactionAlertTypeEnum = {
  depositedFiveHundredOrMoreWithinTheFirstWeek: 'depositedMoreThanFiveHundredWithinTheFirstWeek',
  withdrewFiveHundredOrMoreWithinTheFirstWeek: 'withdrewMoreThanFiveHundredWithinTheFirstWeek',
  depositedTwentyFiveHundredOrMoreWithinTheFirstMonth: 'depositedMoreThanTwentyFiveHundredWithinTheFirstMonth',
  withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth: 'withdrewMoreThanTwentyFiveHundredWithinTheFirstMonth',
} as const;
export type SlackTransactionAlertTypeEnumValues = typeof SlackTransactionAlertTypeEnum[keyof typeof SlackTransactionAlertTypeEnum];

const getSlackWarningMessage = (message: string) => `:warning: ${message} :warning:`;

export const SlackAlertMesageBody = {
  [SlackTransactionAlertTypeEnum.depositedFiveHundredOrMoreWithinTheFirstWeek]: (user: IUserDocument, amount: number, daysSinceUserJoined: number) => getSlackWarningMessage(`${SlackTransactionAlertTypeEnum.depositedFiveHundredOrMoreWithinTheFirstWeek} alert: user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just completed an ACH transfer depositing $${amount} within ${daysSinceUserJoined} days of joining Karma Wallet.`),
  [SlackTransactionAlertTypeEnum.withdrewFiveHundredOrMoreWithinTheFirstWeek]: (user: IUserDocument, amount: number, daysSinceUserJoined: number) => getSlackWarningMessage(`${SlackTransactionAlertTypeEnum.withdrewFiveHundredOrMoreWithinTheFirstWeek} user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just completed an ACH transfer withrawing $${amount} within ${daysSinceUserJoined} days of joining Karma Wallet.`),
  [SlackTransactionAlertTypeEnum.depositedTwentyFiveHundredOrMoreWithinTheFirstMonth]: (user: IUserDocument, amount: number, daysSinceUserJoined: number) => getSlackWarningMessage(`${SlackTransactionAlertTypeEnum.depositedTwentyFiveHundredOrMoreWithinTheFirstMonth} user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just completed an ACH transfer depositing $${amount} within ${daysSinceUserJoined} days of joining Karma Wallet.`),
  [SlackTransactionAlertTypeEnum.withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth]: (user: IUserDocument, amount: number, daysSinceUserJoined: number) => getSlackWarningMessage(`${SlackTransactionAlertTypeEnum.withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth} user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just completed an ACH transfer withrawing $${amount} within ${daysSinceUserJoined} days of joining Karma Wallet.`),
} as const;

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
