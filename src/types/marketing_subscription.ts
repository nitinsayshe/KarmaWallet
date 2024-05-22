export enum SubscriptionProvider {
  ActiveCampaign = 'activeCampaign',
}

export enum MarketingSubscriptionStatus {
  Active = 'active',
  Inactive = 'inactive',
  Cancelled = 'cancelled',
}

export enum HubspotFormId {
  groupsInterest = 'f7e43f6a-0925-40a3-8241-6b87061e0fda',
}

// NOTE: if these lists are changed in Active Campaign, This code needs to be
// updated accordingly.
export enum ActiveCampaignListId {
  AccountUpdates = '1', // "Account Updates" will be where new users, who sign up and create an account, should be added to
  BetaTesterInvite = '15',
  BetaTesters = '16',
  BrandContacts = '7',
  DebitCardHolders = '17',
  DebitCardWaitlist = '9',
  EmployerProgramBeta = '18',
  GeneralUpdates = '3', // "General Updates" is going to be the master list that includes both
  GroupAdmins = '4', // Group admin mailing list
  GroupMembers = '5',
  InternalTestGroup = '13',
  MonthyNewsletters = '2', // "Monthly Newsletters" will be the non-users who sign up via the footer
  Q2Payout = '14',
}

export enum MarketingSubscriptionCode {
  accountUpdates = 'accountUpdates',
  betaTesterInvite = 'betaTesterInvite',
  betaTesters = 'betaTesters',
  brandContacts = 'brandContacts',
  debitCardHolders = 'debitCardHolders',
  debitCardWaitlist = 'debitCardWaitlist',
  employerProgramBeta = 'employerProgramBeta',
  generalUpdates = 'generalUpdates',
  groupAdmins = 'groupAdmins',
  groupInterestsEmployerBenefit= 'groupInterestsEmployerBenefit',
  groupInterestsNonProfit = 'groupInterestsNonProfit',
  groupInterestsOther = 'groupInterestsOther',
  groupInterestsSocialMediaCommunity = 'groupInterestsSocialMediaCommunity',
  groupMembers = 'groupMembers',
  internalTestGroup = 'internalTestGroup',
  monthlyNewsletters = 'monthlyNewsletters',
  q2Payout = 'q2Payout',
}
