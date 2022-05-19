import { Router } from 'express';
import * as SocketController from '../../controllers/admin/socket';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/emit')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), SocketController.emitSocketEvent);

export default router;
