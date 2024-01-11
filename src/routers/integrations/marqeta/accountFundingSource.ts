import { Router } from 'express';
import * as ACHFundingSourceController from '../../../controllers/integrations/marqeta/accountFundingSource';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/banktransfer/:achToken')
  .get(ACHFundingSourceController.getACHBankTransfer);

router.route('/banktransfer')
  .get(ACHFundingSourceController.listACHBankTransfer);

router.route('/fundingSource')
  .get(authenticate, ACHFundingSourceController.getLocalACHFundingSource);

router.route('/getBankTransfer')
  .get(authenticate, ACHFundingSourceController.getLocalACHBankTransfer);

export default router;
