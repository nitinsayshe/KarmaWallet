import { Router } from 'express';
import * as DepositAccountController from '../../../controllers/integrations/marqeta/depositAccount';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/create')
  .post(authenticate, DepositAccountController.createDepositAccount);

router.route('/list')
  .get(authenticate, DepositAccountController.listDepositAccount);

export default router;
