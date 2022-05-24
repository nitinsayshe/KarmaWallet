import { getCompanyRatingsThresholds } from '../services/misc';
import { CompanyRating } from './constants/company';

export const getCompanyRatingFromScore = async (score: number) => {
  const companyRatingThresholds = await getCompanyRatingsThresholds();
  if (score > companyRatingThresholds[CompanyRating.Neutral].max) return CompanyRating.Positive;
  if (score < companyRatingThresholds[CompanyRating.Neutral].min) return CompanyRating.Negative;
  return CompanyRating.Neutral;
};
