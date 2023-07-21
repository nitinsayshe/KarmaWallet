import { UserCommissionPercentage } from '../../lib/constants';
import {
  IKardMerchantIntegration,
  IMerchantDocument,
  IShareableMerchant,
  IWildfireMerchantIntegration,
} from '../../models/merchant';
import { getMerchantRateDescription } from './utils';

export interface IShareableMerchantWithEnrichedData extends IShareableMerchant {
  maxDescription?: string;
  maxAmount: string;
  domain?: string;
}

export type ShareableMerchantIntegration = {
  merchantId: number | string;
  Name: string;
  PaysNewCustomersOnly?: {
    type: Boolean;
  };
  domain: string;
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
  };
};

export const getShareableMerchant = ({
  _id,
  name,
  integrations,
}: IMerchantDocument): IShareableMerchantWithEnrichedData => {
  let maxDescription = '';
  let maxAmount = '';
  let _integrations = {};
  if (integrations?.wildfire) {
    const amount = integrations.wildfire?.domains?.[0]?.Merchant?.MaxRate?.Amount;
    const kind = integrations.wildfire?.domains?.[0]?.Merchant?.MaxRate?.Kind;
    // the cut that we are passing on to end user is 75%
    const maxAmountNumber = !!amount ? Math.round(amount * UserCommissionPercentage * 100) / 100 : 0;
    const descriptions = getMerchantRateDescription(kind?.toLowerCase(), maxAmountNumber);
    maxAmount = descriptions.maxAmount;
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
    const descriptions = getMerchantRateDescription(integrations.kard?.maxOffer?.commissionType, maxAmountNumber);
    maxAmount = descriptions.maxAmount;
    maxDescription = descriptions.maxDescription;
    name = integrations?.kard?.name;

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
