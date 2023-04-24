import { IMerchantDocument, IShareableMerchant, IWildfireMerchantIntegration } from '../../models/merchant';
import { getMaxWildfireMerchantRateDescription } from './utils';

export interface IShareableMerchantWithEnrichedData extends IShareableMerchant {
  maxDescription?: string;
  maxAmount: string;
  domain?: string;
}

export const getShareableWildfireIntegration = (wildfireIntegration: IWildfireMerchantIntegration) => {
  const { merchantId, Name, PaysNewCustomersOnly, domains } = wildfireIntegration;
  const domain = domains?.[0];
  return {
    merchantId,
    Name,
    PaysNewCustomersOnly,
    domain: domain?.Domain || '',
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
    const maxAmountNumber = !!amount ? Math.round((amount * 0.75) * 100) / 100 : 0;
    const descriptions = getMaxWildfireMerchantRateDescription(kind, maxAmountNumber);
    maxAmount = descriptions.maxAmount;
    maxDescription = descriptions.maxDescription;
    name = integrations?.wildfire.Name;
    _integrations = {
      wildfire: getShareableWildfireIntegration(integrations.wildfire),
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
