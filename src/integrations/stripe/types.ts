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

enum IPriceType {
  one_time = 'one_time',
  recurring = 'recurring',
}

export interface IListPricesParams {
  active?: boolean;
  numberToList?: number;
  product?: string;
  type?: IPriceType;
}
