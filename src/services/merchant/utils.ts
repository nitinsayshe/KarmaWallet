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
      maxAmount = Amount % 1 === 0 ? `${Amount}%` : `${Amount.toFixed(2)}%`;
      if (Amount === 0) maxAmount = '0';
      maxDescription = `Up to ${maxAmount}`;
      amount = Amount;
      break;
    }
    case WildfireRateKinds.Flat: {
      maxAmount = Amount % 1 === 0 ? `$${Amount}` : `$${Amount.toFixed(2)}`;
      if (Amount === 0) maxAmount = '0';
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
