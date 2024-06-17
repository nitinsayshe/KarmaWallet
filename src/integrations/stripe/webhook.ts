import Stripe from 'stripe';
import { deleteProductSubscriptionFromStripeProduct, updateOrCreateProductSubscriptionFromStripeProduct } from './product';
import { addStripeIntegrationToUser, updateStripeIntegrationForUser } from './customer';
import { createInvoiceFromStripeInvoice, handleStripeInvoicePaid, updateInvoiceFromStripeInvoice } from './invoice';
import { createUserProductSubscriptionFromStripeSubscription, updateUserProductSubscriptionFromStripeSubscription } from './subscription';

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
  console.log('///// event', event);
};

export const handleCustomerEvent = async (event: Stripe.Event) => {
  const { type } = event;

  switch (type) {
    case 'customer.created':
      await addStripeIntegrationToUser(event.data.object);
      break;
    case 'customer.updated':
      await updateStripeIntegrationForUser(event.data.object);
      break;
    case 'customer.subscription.created':
      // create a subscription for the user
      break;
    default:
      break;
  }
};

export const handleInvoiceEvent = async (event: Stripe.Event) => {
  const { type } = event;

  switch (type) {
    case 'invoice.created':
      createInvoiceFromStripeInvoice(event.data.object);
      // create an invoice for the user
      break;
    case 'invoice.finalized':
      updateInvoiceFromStripeInvoice(event.data.object);
      // finalize the invoice
      break;
    case 'invoice.paid':
      handleStripeInvoicePaid(event.data.object);
      // update the invoice to paid
      break;
    case 'invoice.updated':
      updateInvoiceFromStripeInvoice(event.data.object);
      // update the invoice
      break;
    case 'invoice.payment_failed':
      updateInvoiceFromStripeInvoice(event.data.object);
      // update the invoice to failed
      break;
    case 'invoice.payment_succeeded':
      updateInvoiceFromStripeInvoice(event.data.object);
      // update the invoice to paid
      break;
    case 'invoice.marked_uncollectible':
      updateInvoiceFromStripeInvoice(event.data.object);
      // update the invoice to uncollectible
      break;
    case 'invoice.deleted':
      updateInvoiceFromStripeInvoice(event.data.object);
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
      updateOrCreateProductSubscriptionFromStripeProduct(event.data.object);
      break;
    case 'product.updated':
      updateOrCreateProductSubscriptionFromStripeProduct(event.data.object);
      // update the subscription in our database
      break;
    case 'product.deleted':
      deleteProductSubscriptionFromStripeProduct(event.data.object);
      // delete the subscription in our database?
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

export const processStripeWebhookEvent = async (event: Stripe.Event) => {
  const { type } = event;

  if (!type) throw new Error('Event type not found');
  if (type.includes('checkout')) handleCheckoutEvent(event);
  if (type.includes('customer')) handleCustomerEvent(event);
  if (type.includes('invoice')) handleInvoiceEvent(event);
  if (type.includes('payment_intent')) handlePaymentIntentEvent(event);
  if (type.includes('product')) handleProductEvent(event);
  if (type.includes('customer.subscription')) handleSubscriptionEvent(event);
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
