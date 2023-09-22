import { Express, Router } from 'express';
import * as BankConnectionsController from '../controllers/bankConnections';
import authenticate from '../middleware/authenticate';

const router = Router();

router.route('/')
  .get(authenticate, BankConnectionsController.getBankConnections);

export default (app: Express) => app.use('/bank', router);
