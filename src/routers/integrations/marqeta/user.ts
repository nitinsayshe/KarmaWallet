import { Router } from 'express';
import * as UserController from '../../../controllers/integrations/marqeta/user';

const router = Router();

router.route('/create')
  .post(UserController.createMarqetaUser);

router.route('/list')
  .get(UserController.listMarqetaUser);

router.route('/profile/:userToken')
  .get(UserController.getMarqetaUser);

router.route('/update/:userToken')
  .put(UserController.updateMarqetaUser);

router.route('/transition/:userToken')
  .post(UserController.userMarqetaTransition);

router.route('/transition/:userToken')
  .get(UserController.listMarqetaUserTransition);

router.route('/accesstoken')
  .post(UserController.createMarqetaClientAccessToken);

router.route('/accesstoken/:accessToken')
  .get(UserController.listMarqetaUserTransition);

router.route('/onetime-auth')
  .post(UserController.createMarqetaUserAuthToken);

export default router;
