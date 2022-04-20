import { Router } from 'express';
import * as JobController from '../../controllers/admin/job';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/group-verification-email')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), JobController.sendGroupVerificationEmail);

router.route('/email-verification')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), JobController.sendEmailVerification);

router.route('/welcome-email')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), JobController.sendWelcomeEmail);

router.route('/')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), JobController.logJobs)
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), JobController.createJob);

router.route('/obliterate-queue')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), JobController.obliterateQueue);

router.route('/add-cron-jobs')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), JobController.addCronJobs);

export default router;
