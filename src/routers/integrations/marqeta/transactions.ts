import { Router } from 'express';
import * as TransactionController from '../../../controllers/integrations/marqeta/transactions';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.post(
  '/',
  authenticate,
  TransactionController.makeTransaction,
);

router.post(
  '/advice',
  authenticate,
  TransactionController.makeTransactionAdvice,
);

router.post(
  '/clearing',
  authenticate,
  TransactionController.makeTransactionClearing,
);

router.get(
  '/list',
  authenticate,
  TransactionController.listTransaction,
);

export default router;
