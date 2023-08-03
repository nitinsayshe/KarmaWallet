import { Router } from 'express';
import * as KycController from '../../../controllers/integrations/marqeta/kyc';
// import authenticate from '../../middleware/authenticate';

const router = Router();

router.route('/process')
  .post(KycController.processUserKyc);

router.route('/list/:userToken')
  .get(KycController.listUserKyc);

export default router;
