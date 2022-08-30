import { IWildfireMerchantRateIntegration } from '../../models/merchantRate';

export const WildfireRateKinds = {
  Percentage: 'percentage',
  Flat: 'flat',
};

export const getMaxWildfireMerchantRateDescription = (merchantRate: Partial<IWildfireMerchantRateIntegration>) => {
  const { Kind, Amount } = merchantRate;
  let maxAmount = '';
  let maxDescription = '';
  let amount = 0;
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
      amount = Amount;
      break;
    }
    case WildfireRateKinds.Flat: {
      maxAmount = Amount % 1 === 0 ? `$${Amount}` : `${Amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
      maxDescription = `Up to ${maxAmount}`;
      amount = Amount;
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
    amount,
  };
};
