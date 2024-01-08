import { CommissionType } from '../../clients/kard';

export const getMerchantRateDescription = (
  Kind: string | CommissionType,
  Amount: number,
): { maxDescription: string; maxAmount: string; amount: number } => {
  let maxDescription = '';
  if (!Kind) {
    return {
      maxAmount: Amount.toString(),
      maxDescription,
      amount: Amount,
    };
  }

  const kind = Kind?.toLowerCase();
  if (kind !== 'fixed' && kind !== 'percentage' && kind !== 'flat') {
    return {
      maxDescription,
      maxAmount: Amount.toString(),
      amount: Amount,
    };
  }

  maxDescription = `Up to ${Amount}`;
  return {
    maxDescription,
    maxAmount: Amount.toString(),
    amount: Amount,
  };
};
