import { Router } from 'express';
import * as AdminUserController from '../../controllers/admin/users';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }), AdminUserController.getUsers);

export default router;
