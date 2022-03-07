import { Express, Router } from 'express';
import * as UserController from '../controllers/user';
import authenticate from '../middleware/authenticate';

const router = Router();

router.post('/register', UserController.register);
router.post('/login', UserController.login);

router.post('/password/token/create', UserController.createPasswordResetToken);
router.post('/password/token/verify', UserController.checkPasswordResetToken);
router.put('/password/token', UserController.resetPasswordFromToken);

// Authenticated
router.post('/logout', authenticate, UserController.logout);
router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, UserController.updateProfile);
router.get('/session', authenticate, UserController.getProfile);
router.put('/password', authenticate, UserController.updatePassword);
router.post('/alt-email/token/create', authenticate, UserController.sendAltEmailVerification);
router.post('/alt-email/token/verify', authenticate, UserController.verifyAltEmail);

export default (app: Express) => app.use('/user', router);
