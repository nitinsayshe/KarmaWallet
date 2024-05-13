export enum HubspotFormId {
  groupsInterest = 'f7e43f6a-0925-40a3-8241-6b87061e0fda',
}

export enum InterestCategory {
  EmployerBenefit = 'employerBenefit',
  NonProfit = 'nonProfit',
  SocialMediaCommunity = 'socialMediaCommunity',
  Other = 'other'
}

export interface InterestFormRequest {
  firstName?: string;
  lastName?: string;
  email: string;
  organization?: string;
  interestCategory?: InterestCategory;
}
