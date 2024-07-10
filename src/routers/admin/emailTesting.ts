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

router.route('/ach-cancel-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testACHCancellationEmail,
  );

router.route('/ach-return-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testACHReturnedEmail,
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

router.route('/dispute-received-no-provisional-credit-issued-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testDisputeReceivedNoProvisionalCreditIssuedEmail,
  );

router.route('/card-shipped-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testCardShippedEmail,
  );

router.route('/case-lost-provisional-credit-not-already-issued-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testCaseLostProvisionalCreditNotAlreadyIssuedEmail,
  );

router.route('/employer-gift-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testEmployerGiftEmail,
  );

router.route('/karma-card-pending-review-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testKarmaCardPendingReviewEmail,
  );

router.route('/karma-card-decline-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testKarmaCardDeclinedEmail,
  );

router.route('/resume-karma-card-application-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testResumeKarmaCardApplicationEmail,
  );

router.route('/pay-membership-reminder-email')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminEmailTestingController.testPayMembershipReminderEmail,
  );
export default router;
