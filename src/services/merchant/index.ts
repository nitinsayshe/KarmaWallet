import { UserCommissionPercentage } from '../../lib/constants';
import {
  IKardMerchantIntegration,
  IMerchantDocument,
  IShareableMerchant,
  IWildfireMerchantIntegration,
} from '../../models/merchant';
import { getMerchantRateTypeFromString, MerchantRateType } from '../merchantRates';
import { getMerchantRateDescription } from './utils';

export interface IShareableMerchantWithEnrichedData extends IShareableMerchant {
  maxDescription?: string;
  maxAmount: string;
  maxRateType?: MerchantRateType;
  domain?: string;
}

export type ShareableMerchantIntegration = {
  merchantId: number | string;
  Name: string;
  PaysNewCustomersOnly?: {
    type: Boolean;
  };
  domain: string;
  maxRate?: {
    type: MerchantRateType;
    amount: number;
  };
};

export const getShareableIntegrationFromWildfireIntegration = (
  wildfireIntegration: IWildfireMerchantIntegration,
): ShareableMerchantIntegration => {
  const { merchantId, Name, PaysNewCustomersOnly, domains } = wildfireIntegration;
  const domain = domains?.[0];
  return {
    merchantId,
    Name,
    PaysNewCustomersOnly,
    domain: domain?.Domain || '',
    maxRate: {
      type: getMerchantRateTypeFromString(domain?.Merchant?.MaxRate?.Kind),
      amount: !!domain?.Merchant?.MaxRate?.Amount
        ? Math.round(domain.Merchant.MaxRate.Amount * UserCommissionPercentage * 100) / 100
        : 0,
    },
  };
};

export const getShareableIntegrationFromKardIntegration = (
  kardIntegration: IKardMerchantIntegration,
): ShareableMerchantIntegration => {
  const { id, name, websiteURL } = kardIntegration;
  return {
    merchantId: id,
    Name: name,
    domain: websiteURL || '',
    maxRate: {
      type: getMerchantRateTypeFromString(kardIntegration?.maxOffer?.commissionType),
      amount: kardIntegration?.maxOffer?.totalCommission
        ? Math.round((kardIntegration.maxOffer?.totalCommission || 0) * UserCommissionPercentage)
        : 0,
    },
  };
};

export const getShareableMerchant = ({
  _id,
  name,
  integrations,
}: IMerchantDocument): IShareableMerchantWithEnrichedData => {
  let maxDescription = '';
  let maxAmount = '';
  let maxRateType: MerchantRateType;
  let _integrations = {};
  if (integrations?.wildfire) {
    const amount = integrations.wildfire?.domains?.[0]?.Merchant?.MaxRate?.Amount;
    const kind = integrations.wildfire?.domains?.[0]?.Merchant?.MaxRate?.Kind;
    // the cut that we are passing on to end user is 75%
    const maxAmountNumber = !!amount ? Math.round(amount * UserCommissionPercentage * 100) / 100 : 0;
    const descriptions = getMerchantRateDescription(kind?.toLowerCase(), maxAmountNumber);
    maxAmount = descriptions.maxAmount;
    maxRateType = getMerchantRateTypeFromString(integrations.wildfire?.domains?.[0]?.Merchant?.MaxRate?.Kind);
    maxDescription = descriptions.maxDescription;
    name = integrations?.wildfire.Name;
    _integrations = {
      wildfire: getShareableIntegrationFromWildfireIntegration(integrations.wildfire),
    };
  }
  if (!!integrations?.kard) {
    const maxAmountNumber = !!integrations.kard?.maxOffer?.totalCommission
      ? Math.round((integrations.kard?.maxOffer?.totalCommission || 0) * UserCommissionPercentage)
      : 0;
    const previousMaxAmount = parseFloat(maxAmount);
    if ((!previousMaxAmount || isNaN(previousMaxAmount)) || (!!maxAmountNumber && maxAmountNumber > previousMaxAmount)) {
      const descriptions = getMerchantRateDescription(integrations.kard?.maxOffer?.commissionType, maxAmountNumber);
      maxAmount = descriptions.maxAmount;
      maxRateType = getMerchantRateTypeFromString(integrations.kard?.maxOffer?.commissionType);
      maxDescription = descriptions.maxDescription;
      name = integrations?.kard?.name;
    }

    _integrations = {
      ..._integrations,
      kard: getShareableIntegrationFromKardIntegration(integrations.kard),
    };
  }
  return {
    _id,
    name,
    integrations: _integrations,
    maxDescription,
    maxAmount,
    maxRateType,
  };
};

/*
merchant: {
  name: '',
  maxDescription: 'up to N',
  domain: '',
  type: 'flat | percent',
}
*/
