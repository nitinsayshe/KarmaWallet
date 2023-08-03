import { Router } from 'express';
import * as UserController from '../../../controllers/integrations/marqeta/user';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/create')
  .post(authenticate, UserController.createUser);

router.route('/list')
  .get(UserController.listUser);

router.route('/profile')
  .get(authenticate, UserController.getUser);

router.route('/update')
  .put(authenticate, UserController.updateUser);

router.route('/transition')
  .post(authenticate, UserController.userTransition);

router.route('/transition')
  .get(authenticate, UserController.listUserTransition);

router.route('/accesstoken')
  .post(UserController.createClientAccessToken);

router.route('/accesstoken/:accessToken')
  .get(UserController.listUserTransition);

export default router;
