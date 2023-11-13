import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import { asCustomError } from '../../lib/customError';
import * as UserNotificaitonService from '../../services/user_notification';

export const createUserNotification: IRequestHandler<{}, {}, UserNotificaitonService.CreateNotificationRequest> = async (
  req,
  res,
) => {
  try {
    const results = await UserNotificaitonService.createUserNotification(req);
    if (!results || !results?._id) throw new Error('Error creating user notification');
    const shareableUserNotification = UserNotificaitonService.getShareableUserNotification(results);
    if (!shareableUserNotification || !shareableUserNotification._id) throw new Error('No shareable user notification found');

    output.api(req, res, shareableUserNotification);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
