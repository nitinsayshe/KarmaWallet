import { Express, Router } from 'express';
import * as UserController from '../controllers/user';
import authenticate from '../middleware/authenticate';
import biometricAuthenticate from '../middleware/biometricAuthenticate';
import { KWRateLimiterKeyPrefixes } from '../middleware/rateLimiter';

const router = Router();

const registerRoutes = async (app: Express) => {
  router.post('/register', UserController.register);
  router.post('/login', biometricAuthenticate, app.get(KWRateLimiterKeyPrefixes.Login), UserController.login);
  router.post('/deleteAccountRequest', UserController.deleteAccountRequest);
  router.post(
    '/password/token/create',
    app.get(KWRateLimiterKeyPrefixes.ResetPasswordTokenCreate),
    UserController.createPasswordResetToken,
  );
  router.post('/password/token/verify', UserController.verifyPasswordResetToken);
  router.put('/password/token', UserController.resetPasswordFromToken);
  router.post('/check-email', UserController.checkIfEmailAlreadyInUse);
  router.get('/test-identities', UserController.getTestIdentities);
  router.post('/email/request-change/verify', UserController.verifyEmailChange);

  // Authenticated
  router.post('/logout', authenticate, UserController.logout);
  router.get('/profile', authenticate, UserController.getProfile);
  router.put('/profile', authenticate, UserController.updateProfile);
  router.get('/session', authenticate, UserController.getProfile);
  router.put('/password', authenticate, UserController.updatePassword);
  router.post('/support-ticket', authenticate, UserController.submitSupportTicket);
  router.post('/email/request-change', authenticate, UserController.requestEmailChange);
  router.post('/email/token/create', authenticate, UserController.resendEmailVerification);
  router.post('/email/token/verify', authenticate, UserController.verifyEmail);
};

export default (app: Express) => {
  registerRoutes(app);
  app.use('/user', router);
};
