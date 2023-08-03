import { Router } from 'express';
import * as DepositAccountController from '../../../controllers/integrations/marqeta/depositAccount';
// import authenticate from '../../middleware/authenticate';

const router = Router();

router.route('/create')
  .post(DepositAccountController.createDepositAccount);

router.route('/list/:userToken')
  .get(DepositAccountController.listDepositAccount);

export default router;
