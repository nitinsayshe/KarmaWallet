export enum CompanyRating {
  Positive = 'positive',
  Neutral = 'neutral',
  Negative = 'negative',
}

export const CompanyRatingThresholds = {
  [CompanyRating.Positive]: {
    min: 6,
    max: 16,
  },
  [CompanyRating.Neutral]: {
    min: -11,
    max: 5,
  },
  [CompanyRating.Negative]: {
    min: -16,
    max: -12,
  },
};
