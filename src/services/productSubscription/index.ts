import { generatePaymentLink } from '../../integrations/stripe';
import { IPaymentLinkData } from '../../integrations/stripe/types';
import { asCustomError } from '../../lib/customError';
import { ProductSubscriptionModel } from '../../models/productSubscription';
import { IUserDocument } from '../../models/user';
import { ICreateProductSubscriptionData } from './types';

export const createProductSubscription = async (params: ICreateProductSubscriptionData) => {
  try {
    const dataToSave: ICreateProductSubscriptionData = {
      amount: params.amount,
      name: params.name,
      type: params.type,
      status: params.status,
    };

    if (params.integrations?.stripe) {
      dataToSave.integrations = {
        stripe: params.integrations.stripe,
      };
    }
    const saved = await ProductSubscriptionModel.create(dataToSave);
    return saved;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updateProductSubscription = async (id: string, params: ICreateProductSubscriptionData) => {
  try {
    const productSubscription = await ProductSubscriptionModel.findById(id);
    if (!productSubscription) throw new Error('Product Subscription not found');
    productSubscription.amount = params.amount;
    productSubscription.name = params.name;
    productSubscription.type = params.type;
    productSubscription.status = params.status;
    productSubscription.lastModified = new Date();
    productSubscription.integrations = {
      ...productSubscription.integrations,
      stripe: params.integrations.stripe,
    };
    const updated = await productSubscription.save();
    return updated;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const setupProductSubscriptionForUser = async (user: IUserDocument) => {
  // we are defaulting to standard for everyone, we will want to change this later
  const promoCode = user.integrations.referrals.params.find((param) => param.key === 'membershipPromoCode')?.value;
  const productSubscriptionId = '664e2adfdc54c92877715499';
  const paymentData: IPaymentLinkData = {
    email: user.email,
    userId: user._id.toString(),
    productSubscriptionId,
  };

  if (promoCode) paymentData.promoCode = promoCode;

  await generatePaymentLink(paymentData);
};
