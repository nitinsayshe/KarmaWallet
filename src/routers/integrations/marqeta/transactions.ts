import { Router } from 'express';
import * as TransactionController from '../../../controllers/integrations/marqeta/transactions';

const router = Router();

router.route('/')
  .post(TransactionController.makeTransaction);

router.route('/advice')
  .post(TransactionController.makeTransactionAdvice);

router.route('/clearing')
  .post(TransactionController.makeTransactionClearing);

router.route('/list')
  .get(TransactionController.listTransaction);

export default router;
