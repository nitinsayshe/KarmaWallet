import { Router } from 'express';
import * as AdminCommissionsController from '../../controllers/admin/commissions';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/:type')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }), AdminCommissionsController.getCommissionsForAllUsers);

router.route('/payout-total');
export default router;
