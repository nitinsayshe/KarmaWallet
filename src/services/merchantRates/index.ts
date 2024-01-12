import { UserCommissionPercentage } from '../../lib/constants';
import { roundToPercision } from '../../lib/misc';
import { IMerchantRate, IShareableMerchantRate } from '../../models/merchantRate';
import { getMerchantRateDescription } from '../merchant/utils';

export enum MerchantRateType {
  Flat = 'flat',
  Percent = 'percent',
  None = '',
}

export interface IShareableMerchantRateWithEnrichedData extends IShareableMerchantRate {
  maxDescription?: string;
  name: string;
  maxAmount: string;
  maxRateType?: MerchantRateType;
}

export const getMerchantRateTypeFromString = (kind: string): MerchantRateType => {
  switch (kind?.toLowerCase() || '') {
    case 'flat':
      return MerchantRateType.Flat;
    case 'percent':
      return MerchantRateType.Percent;
    case 'percentage':
      return MerchantRateType.Percent;
    default:
      return MerchantRateType.None;
  }
};

export const getShareableMerchantRate = ({
  _id,
  integrations,
  merchant,
}: IMerchantRate) => {
  let maxDescription = '';
  let maxAmount = '';
  let name = '';
  let maxRateType = MerchantRateType.None;

  if (integrations?.wildfire) {
    const { Amount, Kind } = integrations.wildfire;
    // the cut that we are passing on to end user is 75%
    const maxAmountNumber = !!Amount ? roundToPercision((Amount * UserCommissionPercentage * 100) / 100, 2) : 0;
    const descriptions = getMerchantRateDescription(Kind.toLowerCase(), maxAmountNumber);
    maxAmount = descriptions.maxAmount;
    maxDescription = descriptions.maxDescription;
    name = integrations?.wildfire.Name;
    maxRateType = getMerchantRateTypeFromString(Kind);
  }
  if (integrations?.kard) {
    const amount = integrations.kard?.totalCommission;
    // the cut that we are passing on to end user is 75%
    const maxAmountNumber = !!amount ? roundToPercision((amount * UserCommissionPercentage * 100) / 100, 2) : 0;
    const descriptions = getMerchantRateDescription(integrations.kard?.commissionType, maxAmountNumber);
    maxAmount = descriptions.maxAmount;
    maxDescription = descriptions.maxDescription;
    name = integrations?.kard?.name;
    maxRateType = getMerchantRateTypeFromString(integrations.kard?.commissionType);
  }

  return {
    _id,
    merchant,
    maxDescription,
    maxAmount,
    maxRateType,
    name,
    integrations,
  };
};
