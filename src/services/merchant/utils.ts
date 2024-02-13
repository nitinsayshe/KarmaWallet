import { CommissionType } from '../../clients/kard';

export const getMerchantRateDescription = (
  Kind: string | CommissionType,
  Amount: number,
): { maxDescription: string; maxAmount: string; amount: number } => {
  const kind = Kind ? Kind.toLowerCase() : null;
  const maxDescription = kind === 'percentage' || kind === 'percent'
    ? `Up to ${Amount}%`
    : `Up to $${Amount}`;

  return {
    maxDescription,
    maxAmount: Amount.toString(),
    amount: Amount,
  };
};
