import { Router } from 'express';
import * as PersonaController from '../../controllers/integrations/persona';

const router = Router();

router.route('/accounts')
  .get(PersonaController.getAccounts);

router.route('/createAccount')
  .post(PersonaController.createAccount);

export default router;
