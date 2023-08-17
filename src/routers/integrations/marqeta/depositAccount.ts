import { Router } from 'express';
import * as DepositAccountController from '../../../controllers/integrations/marqeta/depositAccount';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/create/:userToken')
  .post(authenticate, DepositAccountController.createDepositAccount);

router.route('/list/:userToken')
  .get(authenticate, DepositAccountController.listDepositAccount);

export default router;
