import { UserCommissionPercentage, UserCommissionPercentageForKarmaCollective } from '../../lib/constants';
import { MerchantModel } from '../../models/merchant';
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

export const getShareableMerchantRate = async ({
  _id,
  integrations,
  merchant,
}: IMerchantRate) => {
  let maxDescription = '';
  let maxAmount = '';
  let name = '';
  let maxRateType = MerchantRateType.None;
  const merchantData = await MerchantModel.findById(merchant);
  if (!merchantData) {
    throw new Error('Merchant not found');
  }

  if (integrations?.wildfire) {
    const { Amount, Kind } = integrations.wildfire;
    // the cut that we are passing on to end user is 75%
    const maxAmountNumber = Math.round(Amount * UserCommissionPercentage * 100) / 100;
    const descriptions = getMerchantRateDescription(Kind.toLowerCase(), maxAmountNumber);
    maxAmount = descriptions.maxAmount;
    maxDescription = descriptions.maxDescription;
    name = integrations?.wildfire.Name;
    maxRateType = getMerchantRateTypeFromString(Kind);
  }
  if (integrations?.kard) {
    const { karmaCollectiveMember } = merchantData;
    // the cut that we are passing on to end user is 75%
    const userAmount = !!karmaCollectiveMember ? UserCommissionPercentageForKarmaCollective : UserCommissionPercentage;
    const maxAmountNumber = Math.round((integrations.kard?.totalCommission || 0) * userAmount);
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
