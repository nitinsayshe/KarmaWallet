import { Router } from 'express';
import * as TransactionController from '../../../controllers/integrations/marqeta/transactions';

const router = Router();

router.route('/list')
  .get(TransactionController.listTransaction);

export default router;
