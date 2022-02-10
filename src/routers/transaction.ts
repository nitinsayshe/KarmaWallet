import { Express, Router } from 'express';
import * as TransactionController from '../controllers/transaction';
import authenticate from '../middleware/authenticate';

const router = Router();

router.get('/carbon-offsets', authenticate, TransactionController.getCarbonOffsetTransactions); // Get Transactions offset,count

export default (app: Express) => app.use('/transaction', router);
