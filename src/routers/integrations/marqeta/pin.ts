import { Router } from 'express';
import * as PinController from '../../../controllers/integrations/marqeta/pin';

const router = Router();

router.route('/set')
  .put(PinController.setPin);

router.route('/get')
  .post(PinController.getPin);

export default router;
