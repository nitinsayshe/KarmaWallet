import Stripe from 'stripe';
import { ProductSubscriptionModel } from '../../models/productSubscription';
import { ProductSubscriptionPriceModel } from '../../models/productSubscriptionPrice';
import { asCustomError } from '../../lib/customError';

export const updateOrCreateProductSubscriptionPriceFromStripePrice = async (price: Stripe.Price) => {
  console.log('///// Update or Create Price');
  try {
    let productSubscriptionPrice = await ProductSubscriptionPriceModel.findOne({ 'integrations.stripe.id': price.id });

    if (!productSubscriptionPrice) {
      const product = await ProductSubscriptionModel.findOne({ 'integrations.stripe.id': price.product });

      if (!product) {
        console.log('Product not found for price', price);
      }

      productSubscriptionPrice = await ProductSubscriptionPriceModel.create({
        productSubscription: product?._id || null,
        active: price.active,
        amount: (price.unit_amount / 100).toString(),
        integrations: {
          stripe: price,
        },
      });
    } else {
      productSubscriptionPrice.active = price.active;
      productSubscriptionPrice.amount = (price.unit_amount / 100).toString();
      productSubscriptionPrice.integrations.stripe = price;
      productSubscriptionPrice.save();
    }
  } catch (err) {
    throw asCustomError(err);
  }
};
