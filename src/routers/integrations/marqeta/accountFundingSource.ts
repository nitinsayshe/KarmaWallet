import { Router } from 'express';
import * as ACHFundingSourceController from '../../../controllers/integrations/marqeta/accountFundingSource';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/fundingSource')
  .post(authenticate, ACHFundingSourceController.createAchFundingSource);

router.route('/banktransfer')
  .post(authenticate, ACHFundingSourceController.createACHBankTransfer);

export default router;
