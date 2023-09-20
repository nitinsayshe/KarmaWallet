import { Express, Router } from 'express';
import * as BankController from '../controllers/bank';
import authenticate from '../middleware/authenticate';

const router = Router();

router.route('/')
  .get(authenticate, BankController.getBanks);

export default (app: Express) => app.use('/bank', router);
