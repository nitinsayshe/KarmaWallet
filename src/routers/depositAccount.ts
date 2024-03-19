import { Express, Router } from 'express';
import authenticate from '../middleware/authenticate';
import * as DepositAccountContoller from '../controllers/depositAccount';

const router = Router();

router.route('/')
  .get(authenticate, DepositAccountContoller.getDepositAccounts);

router.route('/active')
  .get(authenticate, DepositAccountContoller.getActiveDepositAccount);

export default (app: Express) => app.use('/deposit-account', router);
