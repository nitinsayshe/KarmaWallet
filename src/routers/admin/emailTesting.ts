import { Router } from 'express';
import * as AdminEmailTestingController from '../../controllers/admin/emailTesting';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/cashback-payout-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testCashbackPayoutEmail,
  );

router.route('/ach-initiation-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testACHInitiationEmail,
  );

router.route('/case-won-provisional-credit-already-issued-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testCaseWonProvisionalCreditAlreadyIssuedEmail,
  );

router.route('/no-chargeback-rights-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testNoChargebackRightsEmail,
  );

router.route('/karma-card-welcome-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testKarmaCardWelcomeEmail,
  );

router.route('/change-password-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testChangePasswordEmail,
  );

router.route('/case-lost-provisional-credit-issued-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testCaseLostProvisionalCreditIssuedEmail,
  );

router.route('/provisional-credit-issued-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testProvisionalCreditIssuedEmail,
  );

router.route('/bank-linked-confirmation')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testBankLinkedConfirmationEmail,
  );

router.route('/case-won-provisional-credit-issued-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testCaseWonProvisionalCreditAlreadyIssuedEmail,
  );

router.route('/case-won-provisional-credit-not-already-issued-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testCaseWonProvisionalCreditNotAlreadyIssuedEmail,
  );

router.route('/card-shipped-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testCardShippedEmail,
  );

router.route('/card-delivered-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testCardDeliveredEmail,
  );
export default router;
