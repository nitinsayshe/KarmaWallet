import { Router } from 'express';
import authenticate from '../../middleware/authenticate';
import * as TransactionController from '../../controllers/api/transaction';

const router = Router();

router.route('/enrich').put(authenticate, TransactionController.enrichTransaction);

export default router;
