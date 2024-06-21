import { Price } from '../../clients/stripe/price';
import { StripeClient } from '../../clients/stripe/stripeClient';
import { IListPricesParams } from './types';

export const listPrices = async (params: IListPricesParams) => {
  const stripeClient = new StripeClient();
  const productClient = new Price(stripeClient);
  const response = await productClient.listPrices(params);
  return response;
};
