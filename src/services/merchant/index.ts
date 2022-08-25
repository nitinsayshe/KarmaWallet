import { IMerchantDocument, IShareableMerchant, IWildfireMerchantIntegration } from '../../models/merchant';
import { getMaxWildfireMerchantRateDescription } from './utils';

export interface IShareableMerchantWithEnrichedData extends IShareableMerchant {
  maxDescription?: string;
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
  let _integrations = {};
  if (integrations?.wildfire) {
    maxDescription = getMaxWildfireMerchantRateDescription(integrations.wildfire?.domains?.[0]?.Merchant?.MaxRate);
    _integrations = {
      wildfire: getShareableWildfireIntegration(integrations.wildfire),
    };
  }
  return {
    _id,
    name,
    integrations: _integrations,
    maxDescription,
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
