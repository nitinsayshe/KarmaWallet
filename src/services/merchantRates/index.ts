import { IMerchantRate, IShareableMerchantRate } from '../../models/merchantRate';
import { getMaxWildfireMerchantRateDescription } from '../merchant/utils';

export interface IShareableMerchantRateWithEnrichedData extends IShareableMerchantRate {
  maxDescription?: string;
}

export const getShareableMerchantRate = ({
  _id,
  integrations,
  merchant,
}: IMerchantRate): Partial<IShareableMerchantRateWithEnrichedData> => {
  let maxDescription = '';
  if (integrations?.wildfire) {
    maxDescription = getMaxWildfireMerchantRateDescription(integrations.wildfire);
  }
  return {
    _id,
    merchant,
    maxDescription,
    integrations,
  };
};
