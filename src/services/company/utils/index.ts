import { CompanyRating } from '../../../lib/constants/company';

export const getCompanyRating = ([neg, neut, pos]: [number, number][], score: number) => {
  if (score === null) return null;

  if (score >= neg[0] && score <= neg[1]) return CompanyRating.Negative;
  if (score >= neut[0] && score <= neut[1]) return CompanyRating.Neutral;
  if (score >= pos[0] && score <= pos[1]) return CompanyRating.Positive;

  return null;
};
