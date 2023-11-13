import { NotificationChannelEnum, NotificationChannelEnumValue, NotificationTypeEnumValue } from '../../lib/constants/notification';
import { INotificationDocument, IShareableNotification, NotificationModel } from '../../models/notificaiton';
import { IUserDocument } from '../../models/user';
import { NotificationChannelEffects, NotificationEffectsFunctions } from './effects';

export const getShareableNotification = (notification: INotificationDocument): IShareableNotification => ({
  _id: notification._id,
  createdOn: notification.createdOn,
  lastModified: notification?.lastModified,
}) as IShareableNotification;

export const executeUserNotificaitonEffects = async <DataType>(
  type: NotificationTypeEnumValue,
  user: IUserDocument,
  data?: DataType,
  channel: NotificationChannelEnumValue = NotificationChannelEnum.None,
): Promise<void> => {
  try {
    // pull the notification using the type
    const notification = await NotificationModel.findOne({ type });

    // check if the channel is one of the ones that this notification can be triggered for
    if (!notification?.channels?.includes(channel)) {
      throw new Error(`No notification found for type ${type} and channel ${channel}`);
    }

    // filter out any effects that can't be triggered for this channel
    const notificationChannelEffects = NotificationChannelEffects[channel].map((e) => e.toString());
    const effects = notification?.effects?.filter((effect) => Object.values(notificationChannelEffects).includes(effect.toString()));
    const effectsFunctions = effects.map((effect) => NotificationEffectsFunctions[effect]);

    if (effects?.length < 1) {
      throw new Error(`No notification effects found for type ${type} and channel ${channel}`);
    }
    // execute the effect
    await Promise.all(effectsFunctions?.map(async (effect) => effect<DataType>(user, data)));
  } catch (err) {
    console.error(`Error executing notification effects: ${err}`);
  }
};
