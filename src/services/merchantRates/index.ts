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
    const { Amount, Kind } = integrations.wildfire;
    // the cut that we are passing on to end user is 75%
    const maxAmountNumber = Math.round((Amount * 0.75) * 100) / 100;
    const descriptions = getMaxWildfireMerchantRateDescription(Kind, maxAmountNumber);
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
