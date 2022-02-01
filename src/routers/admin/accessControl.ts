import { Router } from 'express';
import * as AccessControlController from '../../controllers/admin/accessControl';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/users')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }), AccessControlController.getUsers);

router.route('/summary')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }), AccessControlController.getSummary);

router.route('/assignable-roles')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }), AccessControlController.getAssignableRoles);

router.route('/update-role')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }), AccessControlController.updateUserRole);

export default router;
