import { CompanyRating } from './constants/company';
import { MiscModel } from '../models/misc';

export const getCompanyRatingFromScore = async (score: number) => {
  const _companyRatingThresholds = await MiscModel.findOne({ key: 'company-ratings-thresholds' });
  const companyRatingThresholds = JSON.parse(_companyRatingThresholds?.value);
  if (score > companyRatingThresholds[CompanyRating.Neutral].max) return CompanyRating.Positive;
  if (score < companyRatingThresholds[CompanyRating.Neutral].min) return CompanyRating.Negative;
  return CompanyRating.Neutral;
};
