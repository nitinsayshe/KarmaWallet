import Stripe from 'stripe';
import { Product } from '../../clients/stripe/product';
import { StripeClient } from '../../clients/stripe/stripeClient';
import { ProductSubscriptionStatus, ProductSubscriptionType } from '../../models/productSubscription/types';
import { createProductSubscription, updateProductSubscription } from '../../services/productSubscription';
import { ProductSubscriptionModel } from '../../models/productSubscription';

export const createProduct = async (params: Stripe.ProductCreateParams) => {
  const stripeClient = new StripeClient();
  const productClient = new Product(stripeClient);
  const response = await productClient.createProduct(params);
  return response;
};

export const updateProduct = async (productId: string, params: Stripe.ProductUpdateParams) => {
  const stripeClient = new StripeClient();
  const productClient = new Product(stripeClient);
  const response = await productClient.updateProduct(productId, params);
  return response;
};

export const listProducts = async (numberToList?: number) => {
  const stripeClient = new StripeClient();
  const productClient = new Product(stripeClient);
  const response = await productClient.listProducts(numberToList || null);
  return response;
};

export const getPrice = async (priceId: string) => {
  const stripeClient = new StripeClient();
  const productClient = new Product(stripeClient);
  const response = await productClient.getPrice(priceId);
  return response;
};

// Update or Create a Product Subscription from a Stripe Product
export const updateOrCreateProductSubscriptionFromStripeProduct = async (data: Stripe.Product) => {
  console.log('///// Updating or creating a product subscription from a Stripe Product', data.id);
  let productSubscription = await ProductSubscriptionModel.findOne({
    'integrations.stripe': { $exists: true },
    'integrations.stripe.id': data.id,
  });

  let amount = '0';

  if (data?.default_price) {
    // grab the price from the Price endpoint on Stripe
    const res = await getPrice(data.default_price.toString());
    if (res?.unit_amount_decimal) amount = res.unit_amount_decimal;
  }

  const productSubscriptionData = {
    amount,
    status: data.active ? ProductSubscriptionStatus.ACTIVE : ProductSubscriptionStatus.INACTIVE,
    name: data.name,
    type: ProductSubscriptionType.KARMAWALLET,
    integrations: {
      ...productSubscription?.integrations,
      stripe: data,
    },
  };

  if (!!productSubscription) {
    productSubscription = await updateProductSubscription(productSubscription.id, productSubscriptionData);
  } else {
    productSubscription = await createProductSubscription(productSubscriptionData);
  }

  return productSubscription.save();
};

export const createProductSubscriptionsFromStripeProducts = async () => {
  const products = await listProducts();

  if (products?.data) {
    const productSubscriptions = await Promise.all(products.data.map(async (product: Stripe.Product) => updateOrCreateProductSubscriptionFromStripeProduct(product)));
    return productSubscriptions;
  }
};

export const deleteProductSubscriptionFromStripeProduct = async (data: Stripe.Product) => {
  try {
    const productSubscription = await ProductSubscriptionModel.findOne({
      'integrations.stripe': { $exists: true },
      'integrations.stripe.id': data.id,
    });

    if (productSubscription) {
      await productSubscription.delete();
    }

    console.log('Product subscription deleted successfully.');
  } catch (e) {
    throw new Error(`Error deleting product subscription: ${e}`);
  }
};
