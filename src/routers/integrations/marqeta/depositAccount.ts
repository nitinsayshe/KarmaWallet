import { Router } from 'express';
import * as DepositAccountController from '../../../controllers/integrations/marqeta/depositAccount';

const router = Router();

router.route('/create')
  .post(DepositAccountController.createDepositAccount);

router.route('/list')
  .get(DepositAccountController.listDepositAccount);

export default router;
