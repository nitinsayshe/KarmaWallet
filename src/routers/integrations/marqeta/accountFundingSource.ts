import { Router } from 'express';
import * as ACHFundingSourceController from '../../../controllers/integrations/marqeta/accountFundingSource';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/banktransfer')
  .post(authenticate, ACHFundingSourceController.createACHBankTransfer);

router.route('/banktransfer/:achToken')
  .get(ACHFundingSourceController.getACHBankTransfer);

router.route('/banktransfer')
  .get(ACHFundingSourceController.listACHBankTransfer);

export default router;
