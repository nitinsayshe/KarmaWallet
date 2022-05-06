export enum CompanyRatings {
  Positive = 'positive',
  Neutral = 'neutral',
  Negative = 'negative',
}

export const getCompanyRating = ([neg, neut, pos]: [number, number][], score: number) => {
  if (score === null) return null;

  if (score >= neg[0] && score <= neg[1]) return CompanyRatings.Negative;
  if (score >= neut[0] && score <= neut[1]) return CompanyRatings.Neutral;
  if (score >= pos[0] && score <= pos[1]) return CompanyRatings.Positive;

  return null;
};
