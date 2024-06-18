import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { JobNames } from '../lib/constants/jobScheduler';
import { LowBalanceEventModel } from '../models/lowBalanceEvent';
import { createLowBalanceEmailNotification, createLowBalancePushNotification } from '../services/user_notification';
import { UserModel } from '../models/user';
import { getGPABalance } from '../integrations/marqeta/gpa';
import { MIN_BALANCE } from '../lib/constants';

dayjs.extend(utc);

const noOfDaysSinceLastEmailSent = (date: string) => dayjs().utc().diff(dayjs(date), 'day');

export const handleLowBalanceThreshold = async () => {
  // iterate through lowBalanceEvent model to check lastEmailSent field and send notifications
  try {
    const lowBalanceData = await LowBalanceEventModel.find({});

    await Promise.all(lowBalanceData.map(async (lb) => {
      const user = await UserModel.findById(lb.user._id);
      const balanceData = await getGPABalance(user?.integrations?.marqeta?.userToken);
      const availableBalance = balanceData?.data?.gpa?.available_balance;

      if (availableBalance >= MIN_BALANCE) {
        // If balance is greater than $50 delete the collecton
        await lb.delete();
      } else {
        const daysDifference = noOfDaysSinceLastEmailSent(lb.createdDate);
        if (daysDifference === 7 || daysDifference === 30) {
          await createLowBalancePushNotification(user);
          await createLowBalanceEmailNotification(user);

          // Update lastEmailSent field
          await lb.updateOne({ lastEmailSent: dayjs().utc().toDate() });
        }
      }
    }));
  } catch (err) {
    console.error(err);
  }
};

export const exec = async () => {
  await handleLowBalanceThreshold();
};

export const onComplete = async () => {
  console.log(`${JobNames.BalanceThreshold} finished`);
};
