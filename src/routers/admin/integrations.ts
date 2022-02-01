import { Router } from 'express';
import * as AdminPlaidIntegrationsController from '../../controllers/admin/integrations/plaid';
import * as AdminRareIntegrationsController from '../../controllers/admin/integrations/rare';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

// PLAID
const plaidRouter = Router();
plaidRouter.route('/map-existing')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), AdminPlaidIntegrationsController.mapExistingPlaidItems);

plaidRouter.route('/map-transactions-from-plaid')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), AdminPlaidIntegrationsController.mapTransactionsFromPlaid);

plaidRouter.route('/map-categories')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), AdminPlaidIntegrationsController.mapPlaidCategoriesToKarmaCategoriesAndCarbonMultiplier);

plaidRouter.route('/reset-plaid-mapping')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), AdminPlaidIntegrationsController.reset);

router.use('/plaid', plaidRouter);

// RARE
const rareRouter = Router();
rareRouter.route('/test')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), AdminRareIntegrationsController.test);

router.use('/rare', rareRouter);

export default router;
