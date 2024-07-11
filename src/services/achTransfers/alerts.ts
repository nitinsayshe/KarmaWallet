import dayjs from 'dayjs';
import { sendTransactionAlertMessage, SlackTransactionAlertTypeEnum, SlackAlertMesageBody } from '../../integrations/slack';
import { IUserDocument } from '../../models/user';

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

export const sendSlackACHTransferAlert = async (user: IUserDocument, amount: number) => {
  const dateJoined = dayjs(user.integrations.marqeta.created_time).utc();
  const currentDate = dayjs().utc();
  const daysSinceUserJoined = currentDate.diff(dateJoined, 'days');
  if (depositedFiveHundredOrMoreWithinTheFirstWeek(amount, daysSinceUserJoined)) {
    await sendTransactionAlertMessage(SlackAlertMesageBody[SlackTransactionAlertTypeEnum.depositedFiveHundredOrMoreWithinTheFirstWeek](user, amount, daysSinceUserJoined));
  }
  if (withdrewFiveHundredOrMoreWithinTheFirstWeek(amount, daysSinceUserJoined)) {
    await sendTransactionAlertMessage(SlackAlertMesageBody[SlackTransactionAlertTypeEnum.withdrewFiveHundredOrMoreWithinTheFirstWeek](user, amount, daysSinceUserJoined));
  }
  if (depositedTwentyFiveHundredOrMoreWithinTheFirstMonth(amount, daysSinceUserJoined)) {
    await sendTransactionAlertMessage(SlackAlertMesageBody[SlackTransactionAlertTypeEnum.depositedTwentyFiveHundredOrMoreWithinTheFirstMonth](user, amount, daysSinceUserJoined));
  }
  if (withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth(amount, daysSinceUserJoined)) {
    await sendTransactionAlertMessage(SlackAlertMesageBody[SlackTransactionAlertTypeEnum.withdrewTwentyFiveHundredOrMoreWithinTheFirstMonth](user, amount, daysSinceUserJoined));
  }
};
