export enum CompanyRating {
  Positive = 'positive',
  Neutral = 'neutral',
  Negative = 'negative',
}

export const CompanyRatingThresholds = {
  [CompanyRating.Positive]: {
    min: 8,
    max: 16,
  },
  [CompanyRating.Neutral]: {
    min: 0,
    max: 7.99,
  },
  [CompanyRating.Negative]: {
    min: -16,
    max: -0.01,
  },
};
