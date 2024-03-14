import { Express, Router } from 'express';
import authenticate from '../middleware/authenticate';
import * as DepositAccountController from '../controllers/depositAccount';

const router = Router();

router.route('/')
  .get(authenticate, DepositAccountController.getDepositAccount);

export default (app: Express) => app.use('/deposit-account', router);
