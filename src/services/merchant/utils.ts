import { CommissionType } from '../../clients/kard';

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

  switch (Kind?.toLowerCase()) {
    case 'percent': {
      maxAmount = Amount % 1 === 0 ? `${Amount}%` : `${Amount.toFixed(2)}%`;
      break;
    }
    case 'percentage': {
      maxAmount = Amount % 1 === 0 ? `${Amount}%` : `${Amount.toFixed(2)}%`;
      break;
    }
    case 'flat': {
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
