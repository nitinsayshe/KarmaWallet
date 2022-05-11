import { CompanyRating, CompanyRatingThresholds } from './constants/company';

export const getCompanyRating = (score: number) => {
  if (score > CompanyRatingThresholds[CompanyRating.Neutral].max) return CompanyRating.Positive;
  if (score < CompanyRatingThresholds[CompanyRating.Neutral].min) return CompanyRating.Negative;
  return CompanyRating.Neutral;
};
