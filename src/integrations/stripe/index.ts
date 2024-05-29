import { ProductSubscriptionModel } from '../../models/productSubscription';
import { IPaymentLinkData } from './types';

export const generatePaymentLink = async (data: IPaymentLinkData) => {
  const baseUrl = await ProductSubscriptionModel.findById(data.productSubscriptionId);
  console.log('////// this is the url', baseUrl);
  return `${baseUrl}?prefilled_email=${data.email}&client_reference_id=${data.userId}${data.promoCode ? `&prefilled_promo_code=${data.promoCode}` : ''}`;
};
