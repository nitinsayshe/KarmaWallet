import { Router } from 'express';
import * as ACHFundingSourceController from '../../../controllers/integrations/marqeta/accountFundingSource';

const router = Router();

router.route('/fundingSource')
  .post(ACHFundingSourceController.createAchFundingSource);

router.route('/banktransfer')
  .post(ACHFundingSourceController.createACHBankTransfer);

router.route('/banktransfer/:achToken')
  .get(ACHFundingSourceController.getACHBankTransfer);

router.route('/banktransfer')
  .get(ACHFundingSourceController.listACHBankTransfer);

export default router;
