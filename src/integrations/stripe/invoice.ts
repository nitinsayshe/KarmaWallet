import Stripe from 'stripe';
import { InvoiceModel } from '../../models/invoice';
import { UserModel } from '../../models/user';
import { UserProductSubscriptionModel } from '../../models/userProductSubscription';
import { InvoiceStatus } from '../../models/invoice/types';
import { Invoice } from '../../clients/stripe/invoice';
import { StripeClient } from '../../clients/stripe/stripeClient';

export const getInvoiceStatusFromStripeStatus = (status: Stripe.Invoice.Status) => {
  switch (status) {
    case 'draft':
      return InvoiceStatus.draft;
    case 'open':
      return InvoiceStatus.open;
    case 'paid':
      return InvoiceStatus.paid;
    case 'uncollectible':
      return InvoiceStatus.uncollectible;
    case 'void':
      return InvoiceStatus.void;
    default:
      return InvoiceStatus.draft;
  }
};

export const createInvoiceFromStripeInvoice = async (data: Stripe.Invoice) => {
  const user = await UserModel.findOne({ 'integrations.stripe.id': data.customer });
  const userProductSubscription = await UserProductSubscriptionModel.findOne({ 'integrations.stripe.id': data.subscription });

  const newInvoice = await InvoiceModel.create({
    amount: data.amount_due,
    status: data.status,
    paymentLink: data.hosted_invoice_url,
    user: user?._id,
    userProductSubscription: userProductSubscription?._id || null,
    integrations: {
      stripe: {
        ...data,
      },
    },
  });

  return newInvoice;
};

export const updateInvoiceFromStripeInvoice = async (data: Stripe.InvoiceUpdatedEvent.Data) => {
  const { object } = data;
  const invoice = await InvoiceModel.findOne({ 'integrations.stripe.id': object.id });
  if (!invoice) throw new Error('Invoice not found');

  invoice.amount = object.amount_due;
  invoice.status = getInvoiceStatusFromStripeStatus(object.status);
  invoice.paymentLink = object.hosted_invoice_url;
  invoice.lastModified = new Date();
  await invoice.save();
  return invoice;
};

export const getInvoiceFromStripe = async (invoiceId: string) => {
  const stripeClient = new StripeClient();
  const invoiceClient = new Invoice(stripeClient);

  const invoice = await invoiceClient.retrieveInvoice(invoiceId);
  return invoice;
};
