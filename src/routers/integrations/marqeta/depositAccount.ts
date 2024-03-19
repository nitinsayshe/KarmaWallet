import { Router } from 'express';
import * as DepositAccountController from '../../../controllers/integrations/marqeta/depositAcccount';

const router = Router();

router.route('/')
  .get(DepositAccountController.getDepositAccount);

router.route('/transition')
  .post(DepositAccountController.depositAccountTransition);

export default router;
