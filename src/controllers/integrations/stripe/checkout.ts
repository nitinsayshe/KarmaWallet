import Stripe from 'stripe';
import * as StripeCheckoutService from '../../../integrations/stripe/checkout';
import * as output from '../../../services/output';
import { IRequestHandler } from '../../../types/request';
import { asCustomError } from '../../../lib/customError';

export const retrieveCheckoutSession: IRequestHandler<{ productId: string }, {}, Stripe.Checkout.SessionRetrieveParams> = async (req, res) => {
  try {
    const { params } = req;
    const data = await StripeCheckoutService.retrieveCheckoutSession(params.productId);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createKarmaCardMembershipCustomerSession: IRequestHandler<{ userId: string, productPrice?: string, uiMode?: Stripe.Checkout.SessionCreateParams.UiMode }, {}, Stripe.Checkout.Session> = async (req, res) => {
  try {
    const { params } = req;
    const data = await StripeCheckoutService.createKarmaCardMembershipCustomerSession(params.userId, params.productPrice, params.uiMode);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
