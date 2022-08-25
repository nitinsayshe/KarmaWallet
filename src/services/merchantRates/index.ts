import { IMerchantRate, IShareableMerchantRate } from '../../models/merchantRate';
import { getMaxWildfireMerchantRateDescription } from '../merchant/utils';

export interface IShareableMerchantRateWithEnrichedData extends IShareableMerchantRate {
  maxDescription?: string;
  name: string;
  maxAmount: string;
}

export const getShareableMerchantRate = ({
  _id,
  integrations,
  merchant,
}: IMerchantRate): Partial<IShareableMerchantRateWithEnrichedData> => {
  let maxDescription = '';
  let maxAmount = '';
  let name = '';
  if (integrations?.wildfire) {
    const descriptions = getMaxWildfireMerchantRateDescription(integrations.wildfire);
    maxAmount = descriptions.maxAmount;
    maxDescription = descriptions.maxDescription;
    name = integrations?.wildfire.Name;
  }
  return {
    _id,
    merchant,
    maxDescription,
    maxAmount,
    name,
    integrations,
  };
};
