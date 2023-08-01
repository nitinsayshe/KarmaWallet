import { UserCommissionPercentage } from '../../lib/constants';
import { IMerchantRate, IShareableMerchantRate } from '../../models/merchantRate';
import { getMerchantRateDescription } from '../merchant/utils';

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
    const maxAmountNumber = Math.round(Amount * UserCommissionPercentage * 100) / 100;
    const descriptions = getMerchantRateDescription(Kind.toLowerCase(), maxAmountNumber);
    maxAmount = descriptions.maxAmount;
    maxDescription = descriptions.maxDescription;
    name = integrations?.wildfire.Name;
  }
  if (integrations?.kard) {
    // the cut that we are passing on to end user is 75%
    const maxAmountNumber = Math.round((integrations.kard?.totalCommission || 0) * UserCommissionPercentage);
    const descriptions = getMerchantRateDescription(integrations.kard?.commissionType, maxAmountNumber);
    maxAmount = descriptions.maxAmount;
    maxDescription = descriptions.maxDescription;
    name = integrations?.kard.name;
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
