import { Router } from 'express';
import * as BiometricController from '../../controllers/integrations/biometric';
import authenticate from '../../middleware/authenticate';

const router = Router();

router.route('/register')
  .post(authenticate, BiometricController.registerBiometric);

router.route('/:identifierKey/remove')
  .delete(authenticate, BiometricController.removeBiometric);

export default router;
