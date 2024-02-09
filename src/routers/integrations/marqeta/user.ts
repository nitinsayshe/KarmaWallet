import { Router } from 'express';
import * as UserController from '../../../controllers/integrations/marqeta/user';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.post(
  '/create',
  authenticate,
  UserController.createMarqetaUser,
);

router.get(
  '/list',
  authenticate,
  UserController.listMarqetaUser,
);

router.get(
  '/profile/:userToken',
  authenticate,
  UserController.getMarqetaUser,
);

router.put(
  '/update/:userToken',
  authenticate,
  UserController.updateMarqetaUser,
);

router.post(
  '/transition/:userToken',
  authenticate,
  UserController.userMarqetaTransition,
);

router.get(
  '/transition/:userToken',
  authenticate,
  UserController.listMarqetaUserTransition,
);

router.post(
  '/accesstoken',
  authenticate,
  UserController.createMarqetaClientAccessToken,
);

router.get(
  '/accesstoken/:accessToken',
  authenticate,
  UserController.listMarqetaUserTransition,
);

router.post(
  '/onetime-auth',
  authenticate,
  UserController.createMarqetaUserAuthToken,
);

export default router;
