import { Router } from 'express';
import * as PinController from '../../../controllers/integrations/marqeta/pin';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/set')
  .put(authenticate, PinController.setPin);

router.route('/get')
  .post(authenticate, PinController.getPin);

export default router;
