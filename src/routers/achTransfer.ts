import { Express, Router } from 'express';
import authenticate from '../middleware/authenticate';
import * as AchTransferController from '../controllers/achTransfer';

const router = Router();

router.route('/')
  .get(authenticate, AchTransferController.getACHTransfers);

router.route('/pending')
  .get(authenticate, AchTransferController.getPendingACHTransfers);

router.route('/update/:achTransferId')
  .post(authenticate, AchTransferController.updateACHBankTransfer);

router.route('/create')
  .post(authenticate, AchTransferController.initiateACHBankTransfer);

export default (app: Express) => app.use('/ach-transfer', router);
