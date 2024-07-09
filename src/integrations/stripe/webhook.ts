import Stripe from 'stripe';
import { deleteProductSubscriptionFromStripeProduct, updateOrCreateProductSubscriptionFromStripeProduct } from './product';
import { addStripeIntegrationToUser, updateStripeIntegrationForUser } from './customer';
import { createInvoiceFromStripeInvoice, handleStripeInvoicePaid, updateInvoiceFromStripeInvoice } from './invoice';
import { createUserProductSubscriptionFromStripeSubscription, updateUserProductSubscriptionFromStripeSubscription } from './subscription';
import { updateOrCreateProductSubscriptionPriceFromStripePrice } from '../../services/productSubscriptionPrice';
import { createMembershipPromoFromStripePromo, updateMembershipPromoFromStripePromo } from './promo';

export const handleCheckoutEvent = async (event: Stripe.Event) => {
  const { type } = event;

  switch (type) {
    case 'checkout.session.completed':
      // create a checkout session for the user
      break;
    case 'checkout.session.expired':
      break;
    default:
      break;
  }
};

export const handleSubscriptionEvent = async (event: Stripe.Event) => {
  const { type } = event;

  switch (type) {
    case 'customer.subscription.created':
      await createUserProductSubscriptionFromStripeSubscription(event.data);
      // create a subscription for the user
      break;
    case 'customer.subscription.updated':
      await updateUserProductSubscriptionFromStripeSubscription(event.data);
      // update the subscription for the user
      break;
    case 'customer.subscription.deleted':
      // delete the subscription for the user
      break;
    default:
      break;
  }
};

export const handleCustomerEvent = async (event: Stripe.Event) => {
  const { type } = event;

  if (type.includes('customer.subscription')) {
    await handleSubscriptionEvent(event);
  }

  switch (type) {
    case 'customer.created':
      await addStripeIntegrationToUser(event.data.object);
      break;
    case 'customer.updated':
      await updateStripeIntegrationForUser(event.data.object);
      break;
    default:
      break;
  }
};

export const handleInvoiceEvent = async (event: Stripe.Event) => {
  const { type } = event;

  switch (type) {
    case 'invoice.created':
      await createInvoiceFromStripeInvoice(event.data.object);
      // create an invoice for the user
      break;
    case 'invoice.finalized':
      await updateInvoiceFromStripeInvoice(event.data.object);
      // finalize the invoice
      break;
    case 'invoice.updated':
      await updateInvoiceFromStripeInvoice(event.data.object);
      // update the invoice
      break;
    case 'invoice.payment_failed':
      await updateInvoiceFromStripeInvoice(event.data.object);
      // update the invoice to failed
      break;
    case 'invoice.payment_succeeded':
      await handleStripeInvoicePaid(event.data.object);
      // update the invoice to paid
      break;
    case 'invoice.marked_uncollectible':
      await updateInvoiceFromStripeInvoice(event.data.object);
      // update the invoice to uncollectible
      break;
    case 'invoice.deleted':
      await updateInvoiceFromStripeInvoice(event.data.object);
      // delete the invoice in our database
      break;
    default:
      break;
  }
};

export const handlePaymentIntentEvent = async (event: Stripe.Event) => {
  console.log('///// event', event);
};

export const handleProductEvent = async (event: Stripe.Event) => {
  const { type } = event;

  switch (type) {
    case 'product.created':
      // cannot figure out how to programatically link a payment_link to a product
      await updateOrCreateProductSubscriptionFromStripeProduct(event.data.object);
      break;
    case 'product.updated':
      await updateOrCreateProductSubscriptionFromStripeProduct(event.data.object);
      // update the subscription in our database
      break;
    case 'product.deleted':
      await deleteProductSubscriptionFromStripeProduct(event.data.object);
      // delete the subscription in our database?
      break;
    default:
      break;
  }
};

export const handlePriceEvent = async (event: Stripe.Event) => {
  const { type } = event;

  switch (type) {
    case 'price.created':
      await updateOrCreateProductSubscriptionPriceFromStripePrice(event.data.object);
      // cannot figure out how to programatically link a payment_link to a product
      break;
    case 'price.updated':
      await updateOrCreateProductSubscriptionPriceFromStripePrice(event.data.object);
      // update the subscription in our database
      break;
    case 'price.deleted':
      // delete the subscription in our database?
      break;
    default:
      break;
  }
};

export const handlerPromotionCodeEvent = async (event: Stripe.Event) => {
  const { type } = event;

  switch (type) {
    case 'promotion_code.created':
      await createMembershipPromoFromStripePromo(event.data.object);
      // create a promotion code for the user
      break;
    case 'promotion_code.updated':
      await updateMembershipPromoFromStripePromo(event.data.object);
      // update the promotion code for the user
      break;
    default:
      break;
  }
};

export const processStripeWebhookEvent = async (event: Stripe.Event) => {
  const { type } = event;

  if (!type) return;
  if (type.includes('checkout')) await handleCheckoutEvent(event);
  if (type.includes('customer')) await handleCustomerEvent(event);
  if (type.includes('invoice')) await handleInvoiceEvent(event);
  if (type.includes('payment_intent')) await handlePaymentIntentEvent(event);
  if (type.includes('product')) await handleProductEvent(event);
  if (type.includes('price')) await handlePriceEvent(event);
  if (type.includes('promotion_code')) await handlerPromotionCodeEvent(event);
};

// EVENTS SENT WHEN SUCCESSFULLY PAYING THE STRIPE PAYMENT LINK
// customer.created - as soon as person hits submit (add to the user integration?)
// payment_intent.created - a payment intent is created for the customer
// customer.updated - customer is updated, it looks like a subscription is added to the customer
// invoice.created - an invoice is created for the customer
// invoice.finalized - not sure what this does? Do we need to update?
// customer.subscription.created - creates a subscription for the user which will be used to charge the user later, will this live in our database? Should we just rely on the information from Stripe?
// charge.succeeded - a charge is successful, we should update the user's balance in our database
// payment_method.attached - dont need to do anything on our end?
// payment_intent.succeeded - payment intent is successful, we should update the user's balance in our database
// invoice.updated - updated something on the invoice?
// invoice.paid - update to paid in our database, update the integration on this...
// invoice.payment_succeeded - payment succeeded, update the user's balance in our database (what's the difference between this and invoice.paid?)
// customer.subscription.updated - subscription is updated, we should update the user's subscription in our database
// checkout.session.completed - checkout session is completed, what do we need to do now? Would we not have handled this with the other webhooks already?
