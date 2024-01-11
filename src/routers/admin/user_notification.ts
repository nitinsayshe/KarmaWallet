import { Router } from 'express';
import * as AdminNotificationController from '../../controllers/admin/user_notification';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

const notificationRouter = router.route('/');
notificationRouter.post(
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  AdminNotificationController.createUserNotification,
);

export default router;
