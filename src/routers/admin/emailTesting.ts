import { Router } from 'express';
import * as AdminEmailTestingController from '../../controllers/admin/emailTesting';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/cashback-payout-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testCashbackPayoutEmail,
  );

export default router;
