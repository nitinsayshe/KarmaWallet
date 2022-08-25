import { IWildfireMerchantRateIntegration } from '../../models/merchantRate';

export const WildfireRateKinds = {
  Percentage: 'percentage',
  Flat: 'flat',
};

export const getMaxWildfireMerchantRateDescription = (merchantRate: Partial<IWildfireMerchantRateIntegration>): string => {
  const { Kind, Amount } = merchantRate;
  if (!Kind) return '';
  switch (Kind.toLowerCase()) {
    case WildfireRateKinds.Percentage:
      return `Up to ${Amount}%`;
    case WildfireRateKinds.Flat:
      return `Up to ${Amount} back`;
    default:
      return '';
  }
};
