import Stripe from 'stripe';
import { IUserDocument } from '../../models/user';

export interface IPaymentLinkData {
  email: string;
  promoCode?: string;
  userId: string;
  productSubscriptionId: string;
}

export interface ICheckoutSessionParams {
  user: IUserDocument;
  productPrice?: string;
  uiMode?: Stripe.Checkout.SessionCreateParams.UiMode;
}

export interface ICheckoutSessionInfo {
  url: string;
  client_secret: string;
}
