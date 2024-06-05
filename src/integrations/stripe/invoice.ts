import Stripe from 'stripe';
import { InvoiceModel } from '../../models/invoice';
import { UserModel } from '../../models/user';
import { UserProductSubscriptionModel } from '../../models/userProductSubscription';
import { InvoiceStatus } from '../../models/invoice/types';

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

export const createInvoiceFromStripeInvoice = async (data: Stripe.InvoiceCreatedEvent.Data) => {
  const { object } = data;
  const user = await UserModel.findOne({ 'integrations.stripe.id': object.customer });
  const userProductSubscription = await UserProductSubscriptionModel.findOne({ 'integrations.stripe.id': object.subscription });

  const newInvoice = await InvoiceModel.create({
    amount: object.amount_due,
    status: object.status,
    paymentLink: object.hosted_invoice_url,
    user: user?._id,
    userProductSubscription: userProductSubscription?._id || null,
    integrations: {
      stripe: {
        ...object,
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
