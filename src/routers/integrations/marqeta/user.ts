import { Router } from 'express';
import * as UserController from '../../../controllers/integrations/marqeta/user';

const router = Router();

router.route('/create')
  .post(UserController.createUser);

router.route('/list')
  .get(UserController.listUser);

router.route('/profile/:userToken')
  .get(UserController.getUser);

router.route('/update/:userToken')
  .put(UserController.updateUser);

router.route('/transition/:userToken')
  .post(UserController.userTransition);

router.route('/transition/:userToken')
  .get(UserController.listUserTransition);

router.route('/accesstoken')
  .post(UserController.createClientAccessToken);

router.route('/accesstoken/:accessToken')
  .get(UserController.listUserTransition);

export default router;
