import { Router } from 'express';
import * as AdminCommissionsController from '../../controllers/admin/commissions';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/pay-commission-payout-overview/:commissionPayoutOverviewId')
  .put(authenticate, protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }), AdminCommissionsController.sendCommissionPayoutOverview);

router.route('/commission-payouts-overviews')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }), AdminCommissionsController.getAllCommissionPayoutOverviews);

router.route('/commissions/:type')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }), AdminCommissionsController.getCommissionsForAllUsers);

router.route('/payout-total');

router.route('/commission-payouts-overviews/:commissionPayoutOverviewId')
  .put(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminCommissionsController.updateCommissionPayoutOverviewStatus,
  );

export default router;
