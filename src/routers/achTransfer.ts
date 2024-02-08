import { Express, Router } from 'express';
import authenticate from '../middleware/authenticate';
import * as AchTransferController from '../controllers/achTransfer';
import protectedRequirements from '../middleware/protected';
import { IMarqetaUserStatus } from '../integrations/marqeta/types';

const router = Router();

router.route('/')
  .get(authenticate, AchTransferController.getACHTransfers);

router.route('/pending')
  .get(authenticate, AchTransferController.getPendingACHTransfers);

router.route('/update/:achTransferId')
  .post(authenticate, AchTransferController.updateACHBankTransfer);

router.route('/create')
  .post(authenticate, protectedRequirements({ marqetaStatus: [IMarqetaUserStatus.ACTIVE] }), AchTransferController.initiateACHBankTransfer);

export default (app: Express) => app.use('/ach-transfer', router);
