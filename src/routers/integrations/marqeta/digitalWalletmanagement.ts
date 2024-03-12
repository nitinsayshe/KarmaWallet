import { Router } from 'express';
import * as DigitalWalletManagementController from '../../../controllers/integrations/marqeta/digitalWalletManagement';
// import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/apple-wallet-provision')
  .post(DigitalWalletManagementController.appleWalletProvision);

router.route('/google-wallet-provision')
  .post(DigitalWalletManagementController.googleWalletProvision);

router.route('/samsung-wallet-provision')
  .post(DigitalWalletManagementController.samsungWalletProvision);

router.route('/:cardToken')
  .get(DigitalWalletManagementController.listDigitalWalletForUserCard);

export default router;
