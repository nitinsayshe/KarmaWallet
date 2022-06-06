import { Express, Router } from 'express';
import * as TransactionController from '../controllers/transaction';
import authenticate from '../middleware/authenticate';

const router = Router();

router.route('/')
  .get(authenticate, TransactionController.getTransactions);

router.route('/carbon-offsets')
  .get(authenticate, TransactionController.getCarbonOffsetTransactions);

router.route('/has-transactions')
  .get(authenticate, TransactionController.hasTransactions);

router.route('/most-recent')
  .get(authenticate, TransactionController.getMostRecentTransactions);

router.route('/rated')
  .get(authenticate, TransactionController.getRatedTransactions);

export default (app: Express) => app.use('/transaction', router);
