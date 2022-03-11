import { Router } from 'express';
import * as AdminGroupsController from '../../controllers/admin/groups';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/summary')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }), AdminGroupsController.getGroupsSummary);

export default router;
