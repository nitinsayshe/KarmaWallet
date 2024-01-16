import { Router } from 'express';
import * as GPAController from '../../../controllers/integrations/marqeta/gpa';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/addfund')
  .post(GPAController.fundUserGPAFromProgramFundingSource);

router.route('/balance')
  .get(authenticate, GPAController.getGPAbalance);

router.route('/program-balance')
  .get(GPAController.getProgramFundingBalance);

export default router;
