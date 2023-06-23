import { Router } from 'express';
import * as UserController from '../../../controllers/integrations/marqeta/user';
// import authenticate from '../../middleware/authenticate';

const router = Router();

router.route('/create')
  .post(UserController.createUser);

router.route('/list')
  .get(UserController.listUser);

export default router;
