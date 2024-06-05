import { Router } from 'express';
import * as StripeCheckoutController from '../../../controllers/integrations/stripe/checkout';

const router = Router();

router.post(
  '/create-membership-checkout-session',
  StripeCheckoutController.createKarmaCardMembershipCustomerSession,
);

export default router;
