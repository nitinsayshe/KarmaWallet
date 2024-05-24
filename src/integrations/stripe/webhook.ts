import Stripe from 'stripe';
import { updateOrCreateProductSubscriptionFromStripeProduct } from './product';
import { addStripeIntegrationToUser, updateStripeIntegrationForUser } from './customer';

export const handleCheckoutEvent = async (event: Stripe.Event) => {
  console.log('///// event', event);
};

export const handleCustomerEvent = async (event: Stripe.Event) => {
  const { type } = event;

  if (type === 'customer.created') {
    await addStripeIntegrationToUser(event.data.object);
    // create a new user
  }

  if (type === 'customer.updated') {
    await updateStripeIntegrationForUser(event.data.object);
    // update the user
  }

  if (type === 'customer.subscription.created') {
    // create a subscription for the user
  }
};

export const handleInvoiceEvent = async (event: Stripe.Event) => {
  console.log('///// event', event);
};

export const handlePaymentIntentEvent = async (event: Stripe.Event) => {
  console.log('///// event', event);
};

export const handleProductEvent = async (event: Stripe.Event) => {
  const { type } = event;

  switch (type) {
    case 'product.created':
      // cannot figure out how to programatically link a payment_link to a product
      updateOrCreateProductSubscriptionFromStripeProduct(event.data.object);
      break;
    case 'product.updated':
      updateOrCreateProductSubscriptionFromStripeProduct(event.data.object);
      // update the subscription in our database
      break;
    case 'product.deleted':
      // delete the subscription in our database?
      break;
    default:
      break;
  }
};

export const handlePaymentLinkEvent = async (event: Stripe.Event) => {
  const { type } = event;

  switch (type) {
    case 'payment_link.created':
      // does not seem to be linked to a product, not sure how we associate this to a subscription/product in our db
      break;
    default:
      break;
  }
};

export const processStripeWebhookEvent = async (event: Stripe.Event) => {
  const { type } = event;

  if (!type) throw new Error('Event type not found');
  if (type.includes('checkout')) handleCheckoutEvent(event);
  if (type.includes('customer')) handleCustomerEvent(event);
  if (type.includes('invoice')) handleInvoiceEvent(event);
  if (type.includes('payment_intent')) handlePaymentIntentEvent(event);
  if (type.includes('product')) handleProductEvent(event);
  if (type.includes('payment_link')) handlePaymentLinkEvent(event);
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
