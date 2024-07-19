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
  initiatedWithdrawal: 'initiatedWithdrawal',
  initiatedDeposit: 'initiatedDeposit',
} as const;
export type SlackTransactionAlertTypeEnumValues = typeof SlackTransactionAlertTypeEnum[keyof typeof SlackTransactionAlertTypeEnum];

const getWarningMessage = (message: string) => `:warning: ${message}`;
const getInitiatedDepositMessage = (message: string) => `:chart_with_upwards_trend: ${message}`;
const getInitiatedWithdrawalMessage = (message: string) => `:chart_with_downwards_trend: ${message}`;

export const SlackAlertMesageBody = {
  [SlackTransactionAlertTypeEnum.depositedFiveHundredOrMoreWithinTheFirstWeek]: (source: SlackAlertSourceEnumValues, user: IUserDocument, amount: number, daysSinceUserJoined: number) => getWarningMessage(`${SlackTransactionAlertTypeEnum.depositedFiveHundredOrMoreWithinTheFirstWeek} :: ${source} :: user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just initiated an ACH transfer depositing $${amount} within ${daysSinceUserJoined} days of joining.`),
  [SlackTransactionAlertTypeEnum.withdrewFiveHundredOrMoreWithinTheFirstWeek]: (source: SlackAlertSourceEnumValues, user: IUserDocument, amount: number, daysSinceUserJoined: number) => getWarningMessage(`${SlackTransactionAlertTypeEnum.withdrewFiveHundredOrMoreWithinTheFirstWeek} :: ${source} :: user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just initiated an ACH transfer withdrawing $${amount} within ${daysSinceUserJoined} days of joining.`),
  [SlackTransactionAlertTypeEnum.depositedTwentyFiveHundredOrMoreWithinTheFirstMonth]: (source: SlackAlertSourceEnumValues, user: IUserDocument, amount: number, daysSinceUserJoined: number) => getWarningMessage(`${SlackTransactionAlertTypeEnum.depositedTwentyFiveHundredOrMoreWithinTheFirstMonth} :: ${source} :: user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just initiated an ACH transfer depositing $${amount} within ${daysSinceUserJoined} days of joining.`),
  [SlackTransactionAlertTypeEnum.withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth]: (source: SlackAlertSourceEnumValues, user: IUserDocument, amount: number, daysSinceUserJoined: number) => getWarningMessage(`${SlackTransactionAlertTypeEnum.withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth} :: ${source} :: user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just initiated an ACH transfer withdrawing $${amount} within ${daysSinceUserJoined} days of joining.`),
  [SlackTransactionAlertTypeEnum.initiatedDeposit]: (source: SlackAlertSourceEnumValues, user: IUserDocument, amount: number) => getInitiatedDepositMessage(`${SlackTransactionAlertTypeEnum.initiatedDeposit} :: ${source} :: user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just initiated an ACH transfer depositing $${amount}.`),
  [SlackTransactionAlertTypeEnum.initiatedWithdrawal]: (source: SlackAlertSourceEnumValues, user: IUserDocument, amount: number) => getInitiatedWithdrawalMessage(`${SlackTransactionAlertTypeEnum.initiatedWithdrawal} :: ${source} :: user with id: ${user._id} and marqeta user token: ${user?.integrations?.marqeta?.userToken} just initiated an ACH transfer withdrawing $${amount}.`),
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
  return channels.channels.find((channel: any) => channel.name === channelName)?.id;
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

  let messageType: SlackTransactionAlertTypeEnumValues = SlackTransactionAlertTypeEnum.initiatedDeposit;
  const absAmount = amount;
  if (transactionType === 'withdrawal') {
    messageType = SlackTransactionAlertTypeEnum.initiatedWithdrawal;
    amount = -Math.abs(amount);
  }

  // logging all pending transfers
  await sendTransactionAlertMessage(SlackAlertMesageBody[messageType](type, user, amount));

  if (depositedFiveHundredOrMoreWithinTheFirstWeek(amount, daysSinceUserJoined)) {
    await sendTransactionAlertMessage(SlackAlertMesageBody[SlackTransactionAlertTypeEnum.depositedFiveHundredOrMoreWithinTheFirstWeek](type, user, absAmount, daysSinceUserJoined));
  }
  if (withdrewFiveHundredOrMoreWithinTheFirstWeek(amount, daysSinceUserJoined)) {
    await sendTransactionAlertMessage(SlackAlertMesageBody[SlackTransactionAlertTypeEnum.withdrewFiveHundredOrMoreWithinTheFirstWeek](type, user, absAmount, daysSinceUserJoined));
  }
  if (depositedTwentyFiveHundredOrMoreWithinTheFirstMonth(amount, daysSinceUserJoined)) {
    await sendTransactionAlertMessage(SlackAlertMesageBody[SlackTransactionAlertTypeEnum.depositedTwentyFiveHundredOrMoreWithinTheFirstMonth](type, user, absAmount, daysSinceUserJoined));
  }
  if (withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth(amount, daysSinceUserJoined)) {
    await sendTransactionAlertMessage(SlackAlertMesageBody[SlackTransactionAlertTypeEnum.withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth](type, user, absAmount, daysSinceUserJoined));
  }
};
