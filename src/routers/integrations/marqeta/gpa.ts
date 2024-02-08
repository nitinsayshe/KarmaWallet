import { Router } from 'express';
import * as GPAController from '../../../controllers/integrations/marqeta/gpa';
import authenticate from '../../../middleware/authenticate';
import protectedRequirements from '../../../middleware/protected';
import { UserRoles } from '../../../lib/constants';

const router = Router();

router.post(
  '/addfund',
  GPAController.fundUserGPAFromProgramFundingSource,
);

router.get(
  '/balance',
  GPAController.getGPAbalance,
);

router.get(
  '/program-balance',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
  GPAController.getProgramFundingBalance,
);

router.post(
  '/unload',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
  GPAController.unloadGPAFundsFromUser,
);

export default router;
