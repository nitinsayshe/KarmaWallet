import { Router } from 'express';
import * as PaypalController from '../../controllers/integrations/paypal';
import authenticate from '../../middleware/authenticate';

const router = Router();

router.route('/link-account')
  .post(authenticate, PaypalController.linkAccount);

router.route('/unlink-account')
  .put(authenticate, PaypalController.linkAccount);

export default router;
