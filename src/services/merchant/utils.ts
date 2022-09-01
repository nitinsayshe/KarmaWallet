enum WildfireRateKinds {
  Percentage = 'percentage',
  Flat = 'flat',
}

export const getMaxWildfireMerchantRateDescription = (Kind: string, Amount: number) => {
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
      maxDescription = `Up to ${Amount.toFixed(2)}%`;
      maxAmount = `${Amount.toFixed(2)}%`;
      amount = Amount;
      break;
    }
    case WildfireRateKinds.Flat: {
      maxAmount = Amount % 1 === 0 ? `$${Amount.toFixed(2)}` : `${Amount.toFixed(2)}`;
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
