import { Router } from 'express';
import * as KycController from '../../../controllers/integrations/marqeta/kyc';

const router = Router();

router.route('/process/:userToken')
  .post(KycController.processUserKyc);

router.route('/list/:userToken')
  .get(KycController.listUserKyc);

router.route('/:kycToken')
  .get(KycController.getKycResult);

export default router;
