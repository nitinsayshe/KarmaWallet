import { Express, Router } from 'express';
import * as UserController from '../controllers/user';
import authenticate from '../middleware/authenticate';
import biometricAuthenticate from '../middleware/biometricAuthenticate';

const router = Router();

router.post('/register', UserController.register);
router.post('/login', biometricAuthenticate, UserController.login);

router.post('/password/token/create', UserController.createPasswordResetToken);
router.post('/password/token/verify', UserController.verifyPasswordResetToken);
router.put('/password/token', UserController.resetPasswordFromToken);
router.post('/check-email', UserController.verifyUserDoesNotAlreadyExist);
router.post('/deleteAccountRequest', UserController.deleteAccountRequest);

router.get('/test-identities', UserController.getTestIdentities);

router.get('/test-identities', UserController.getTestIdentities);

router.get('/test-identities', UserController.getTestIdentities);

// Authenticated
router.post('/logout', authenticate, UserController.logout);
router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, UserController.updateProfile);
router.get('/session', authenticate, UserController.getProfile);
router.put('/password', authenticate, UserController.updatePassword);
router.post('/email/token/create', authenticate, UserController.resendEmailVerification);
router.post('/email/token/verify', authenticate, UserController.verifyEmail);

export default (app: Express) => app.use('/user', router);
