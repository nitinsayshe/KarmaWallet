import Stripe from 'stripe';
import { Product } from '../../clients/stripe/product';
import { StripeClient } from '../../clients/stripe/stripeClient';

// Instantiate the MarqetaClient
const stripeClient = new StripeClient();

// Instantiate the User class
const product = new Product(stripeClient);

export const createProduct = async (params: Stripe.ProductCreateParams) => {
  const response = await product.createProduct(params);
  return response;
};

export const updateProduct = async (productId: string, params: Stripe.ProductUpdateParams) => {
  const response = await product.updateProduct(productId, params);
  return response;
};

export const listProducts = async (numberToList?: number) => {
  const response = await product.listProducts(numberToList || null);
  return response;
};
