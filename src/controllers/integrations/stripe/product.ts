import Stripe from 'stripe';
import { asCustomError } from '../../../lib/customError';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import * as StripeProductService from '../../../integrations/stripe/product';

export const createProduct: IRequestHandler<{}, {}, Stripe.ProductCreateParams> = async (req, res) => {
  try {
    const { body } = req;
    const data = await StripeProductService.createProduct(body);
    console.log(data);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateProduct: IRequestHandler<{ productId: string }, {}, Stripe.ProductUpdateParams> = async (req, res) => {
  try {
    const { body, params } = req;
    const data = await StripeProductService.updateProduct(params.productId, body);
    console.log(data);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listProducts: IRequestHandler<{}, { numberToList?: number }> = async (req, res) => {
  try {
    const { query } = req;
    const data = await StripeProductService.listProducts(query?.numberToList || null);
    console.log(data);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
