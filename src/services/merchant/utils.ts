import { IWildfireMerchantRateIntegration } from '../../models/merchantRate';

export const WildfireRateKinds = {
  Percentage: 'percentage',
  Flat: 'flat',
};

export const getMaxWildfireMerchantRateDescription = (merchantRate: Partial<IWildfireMerchantRateIntegration>) => {
  const { Kind, Amount } = merchantRate;
  let maxAmount = '';
  let maxDescription = '';
  if (!Kind) {
    return {
      maxAmount,
      maxDescription,
    };
  }
  switch (Kind.toLowerCase()) {
    case WildfireRateKinds.Percentage: {
      maxDescription = `Up to ${Amount}%`;
      maxAmount = `${Amount}%`;
      break;
    }
    case WildfireRateKinds.Flat: {
      maxDescription = `Up to ${Amount} back`;
      maxAmount = `$${Amount}`;
      break;
    }
    default:
      return {
        maxDescription,
        maxAmount,
      };
  }
  return {
    maxDescription,
    maxAmount,
  };
};
