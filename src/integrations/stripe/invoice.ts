import Stripe from 'stripe';
import { InvoiceModel } from '../../models/invoice';
import { UserModel } from '../../models/user';
import { UserProductSubscriptionModel } from '../../models/userProductSubscription';
import { InvoiceStatus } from '../../models/invoice/types';
import { Invoice } from '../../clients/stripe/invoice';
import { StripeClient } from '../../clients/stripe/stripeClient';
import { asCustomError } from '../../lib/customError';
import { KarmaMembershipStatusEnum } from '../../models/user/types';

export const getInvoiceStatusFromStripeStatus = (status: Stripe.Invoice.Status) => {
  switch (status) {
    case 'draft':
      return InvoiceStatus.draft;
      // has not been paid yet
    case 'open':
      return InvoiceStatus.open;
    // has been paid
    case 'paid':
      return InvoiceStatus.paid;
    // payment failed
    case 'uncollectible':
      return InvoiceStatus.uncollectible;
    // cancelled
    case 'void':
      return InvoiceStatus.void;
    default:
      return InvoiceStatus.draft;
  }
};

export const getInvoiceFromStripe = async (invoiceId: string) => {
  const stripeClient = new StripeClient();
  const invoiceClient = new Invoice(stripeClient);
  const invoice = await invoiceClient.retrieveInvoice(invoiceId);
  return invoice;
};

export const updateInvoiceFromStripeInvoice = async (data: Stripe.Invoice) => {
  const invoice = await InvoiceModel.findOneAndUpdate(
    {
      'integrations.stripe.id': data.id,
    },
    {
      amount: data.amount_due / 100,
      status: getInvoiceStatusFromStripeStatus(data.status),
      invoiceLink: data.hosted_invoice_url,
      lastModified: new Date(),
    },
    {
      new: true,
    },
  );
  if (!invoice) throw new Error('Invoice not found');

  const userProductSubscription = await UserProductSubscriptionModel.findOne({ 'integrations.stripe.id': data.subscription });
  if (userProductSubscription) {
    userProductSubscription.latestInvoice = invoice._id;
  }
  return invoice;
};

export const createInvoiceFromStripeInvoice = async (data: Stripe.Invoice) => {
  const existingInvoice = await InvoiceModel.findOne({ 'integrations.stripe.id': data.id });
  if (!!existingInvoice) {
    const updated = await updateInvoiceFromStripeInvoice(data);
    return updated;
  }

  const user = await UserModel.findOne({ 'integrations.stripe.id': data.customer });
  if (!user) throw asCustomError(`[x] No user found with stripe id: ${data.customer}`);

  const newInvoice = await InvoiceModel.create({
    amount: data.amount_due / 100,
    status: data.status,
    paymentLink: data.hosted_invoice_url,
    user: user?._id,
    integrations: {
      stripe: data,
    },
  });

  const userProductSubscription = await UserProductSubscriptionModel.findOne({ 'integrations.stripe.id': data.subscription });
  if (userProductSubscription) {
    userProductSubscription.latestInvoice = newInvoice._id;
  }

  return newInvoice;
};

export const handleStripeInvoicePaid = async (data: Stripe.Invoice) => {
  // update the invoice in the invoice collection
  const invoice = await updateInvoiceFromStripeInvoice(data);
  // update the user status to active
  const user = await UserModel.findById(invoice.user);
  user.karmaMembership.status = KarmaMembershipStatusEnum.active;
  await user.save();
  return invoice;
};
