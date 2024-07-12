import { Router } from 'express';
import * as ACHFundingSourceController from '../../../controllers/integrations/marqeta/accountFundingSource';
import authenticate from '../../../middleware/authenticate';
import protectedRequirements from '../../../middleware/protected';
import { IMarqetaUserStatus } from '../../../integrations/marqeta/user/types';

const router = Router();

router.route('/banktransfer/:achToken')
  .get(authenticate, ACHFundingSourceController.getACHBankTransfer);

router.route('/banktransfer')
  .get(authenticate, ACHFundingSourceController.listACHBankTransfer);

router.route('/fundingSource')
  .get(authenticate, protectedRequirements({ marqetaStatus: [IMarqetaUserStatus.ACTIVE] }), ACHFundingSourceController.getLocalACHFundingSource);

router.route('/getBankTransfer')
  .get(authenticate, ACHFundingSourceController.getLocalACHBankTransfer);

export default router;
