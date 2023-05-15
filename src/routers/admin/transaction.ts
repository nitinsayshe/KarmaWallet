import { Router } from 'express';
import * as TransactionController from '../../controllers/admin/transaction';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/false-positives')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin, UserRoles.Admin] }), TransactionController.getFalsePositives);

router.route('/false-positives/:id')
  .put(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin, UserRoles.Admin] }), TransactionController.updateFalsePositive);

router.route('/false-positives/:id')
  .delete(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin, UserRoles.Admin] }), TransactionController.deleteFalsePositive);

router.route('/false-positives')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin, UserRoles.Admin] }), TransactionController.createFalsePositive);

router.route('/manual-matches')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin, UserRoles.Admin] }), TransactionController.getManualMatches);

router.route('/manual-matches/:id')
  .put(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin, UserRoles.Admin] }), TransactionController.updateManualMatch);

router.route('/manual-matches/:id')
  .delete(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin, UserRoles.Admin] }), TransactionController.deleteManualMatch);

router.route('/manual-matches')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin, UserRoles.Admin] }), TransactionController.createManualMatch);

router.route('/matched-companies')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin, UserRoles.Admin] }), TransactionController.getMatchedCompanies);

export default router;
