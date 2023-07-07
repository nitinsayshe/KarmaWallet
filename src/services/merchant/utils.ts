import { CommissionType } from '../../clients/kard';

enum WildfireRateKinds {
  Percentage = 'percentage',
  Flat = 'flat',
}

export const getMerchantRateDescription = (
  Kind: string | CommissionType,
  Amount: number,
): { maxDescription: string; maxAmount: string; amount: number } => {
  let maxAmount = '';
  let maxDescription = '';
  let amount = 0;
  if (!Kind) {
    return {
      maxAmount,
      maxDescription,
      amount,
    };
  }

  switch (Kind) {
    case WildfireRateKinds.Percentage || CommissionType.PERCENT: {
      maxAmount = Amount % 1 === 0 ? `${Amount}%` : `${Amount.toFixed(2)}%`;
      break;
    }
    case WildfireRateKinds.Flat || CommissionType.FLAT: {
      maxAmount = Amount % 1 === 0 ? `$${Amount}` : `$${Amount.toFixed(2)}`;
      break;
    }

    default:
      return {
        maxDescription,
        maxAmount,
        amount,
      };
  }

  if (Amount === 0) maxAmount = '0';
  maxDescription = `Up to ${maxAmount}`;
  amount = Amount;

  return {
    maxDescription,
    maxAmount,
    amount,
  };
};
