import { asCustomError } from '../../lib/customError';
import { ProductSubscriptionModel } from '../../models/productSubscription';
import { ICreateProductSubscriptionData } from './types';

export const StandardKarmaWalletSubscriptionId = process.env.NODE_ENV === 'production' ? '668bf0882131dcea2a04da20' : '666b41cbd9aae931c32ba130';

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
