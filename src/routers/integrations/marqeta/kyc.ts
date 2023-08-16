import { Router } from 'express';
import * as KycController from '../../../controllers/integrations/marqeta/kyc';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/process/:userToken')
  .post(KycController.processUserKyc);

router.route('/list')
  .get(authenticate, KycController.listUserKyc);

router.route('/:kycToken')
  .get(authenticate, KycController.getKycResult);
export default router;
