import { Router } from 'express';
import * as GPAController from '../../../controllers/integrations/marqeta/gpa';
import authenticate from '../../../middleware/authenticate';
import protectedRequirements from '../../../middleware/protected';
import { UserRoles } from '../../../lib/constants';

const router = Router();

router.route('/addfund')
  .post(GPAController.fundUserGPAFromProgramFundingSource);

router.route('/balance')
  .get(authenticate, GPAController.getGPAbalance);

router.route('/program-balance')
  .get(GPAController.getProgramFundingBalance);

router.post(
  '/unload',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
  GPAController.unloadGPAFundsFromUser,
);

export default router;
