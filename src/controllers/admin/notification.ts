import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import { asCustomError } from '../../lib/customError';
import * as NotificaitonService from '../../services/notification';

export const createNotification: IRequestHandler<{}, {}, NotificaitonService.CreateNotificationRequest> = async (
  req,
  res,
) => {
  try {
    const results = await NotificaitonService.createNotification(req);
    if (!results || !results?._id) throw new Error('Error creating notification');
    const shareableNotification = NotificaitonService.getShareableNotification(results);
    if (!shareableNotification || !shareableNotification._id) throw new Error('No shareable notification found');

    output.api(req, res, shareableNotification);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
