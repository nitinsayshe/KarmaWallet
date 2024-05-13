import { InterestCategory } from '../../integrations/hubspot';
import { MarketingSubscriptionCode, ActiveCampaignListId, HubspotFormId } from '../../types/marketing_subscription';

export const MarketingSubscriptionCodeToProviderProductId = {
  [MarketingSubscriptionCode.accountUpdates]: ActiveCampaignListId.AccountUpdates,
  [MarketingSubscriptionCode.betaTesterInvite]: ActiveCampaignListId.BetaTesterInvite,
  [MarketingSubscriptionCode.betaTesters]: ActiveCampaignListId.BetaTesters,
  [MarketingSubscriptionCode.brandContacts]: ActiveCampaignListId.BrandContacts,
  [MarketingSubscriptionCode.debitCardHolders]: ActiveCampaignListId.DebitCardHolders,
  [MarketingSubscriptionCode.debitCardWaitlist]: ActiveCampaignListId.DebitCardWaitlist,
  [MarketingSubscriptionCode.employerProgramBeta]: ActiveCampaignListId.EmployerProgramBeta,
  [MarketingSubscriptionCode.generalUpdates]: ActiveCampaignListId.GeneralUpdates,
  [MarketingSubscriptionCode.groupAdmins]: ActiveCampaignListId.GroupAdmins,
  [MarketingSubscriptionCode.groupInterestsEmployerBenefit]: HubspotFormId.groupsInterest,
  [MarketingSubscriptionCode.groupInterestsNonProfit]: HubspotFormId.groupsInterest,
  [MarketingSubscriptionCode.groupInterestsOther]: HubspotFormId.groupsInterest,
  [MarketingSubscriptionCode.groupInterestsSocialMediaCommunity]: HubspotFormId.groupsInterest,
  [MarketingSubscriptionCode.groupMembers]: ActiveCampaignListId.GroupMembers,
  [MarketingSubscriptionCode.internalTestGroup]: ActiveCampaignListId.InternalTestGroup,
  [MarketingSubscriptionCode.monthlyNewsletters]: ActiveCampaignListId.MonthyNewsletters,
  [MarketingSubscriptionCode.q2Payout]: ActiveCampaignListId.Q2Payout,
};

export const ProviderProductIdToMarketingSubscriptionCode = {
  [ActiveCampaignListId.AccountUpdates]: MarketingSubscriptionCode.accountUpdates,
  [ActiveCampaignListId.BetaTesterInvite]: MarketingSubscriptionCode.betaTesterInvite,
  [ActiveCampaignListId.BetaTesters]: MarketingSubscriptionCode.betaTesters,
  [ActiveCampaignListId.BrandContacts]: MarketingSubscriptionCode.brandContacts,
  [ActiveCampaignListId.DebitCardHolders]: MarketingSubscriptionCode.debitCardHolders,
  [ActiveCampaignListId.DebitCardWaitlist]: MarketingSubscriptionCode.debitCardWaitlist,
  [ActiveCampaignListId.EmployerProgramBeta]: MarketingSubscriptionCode.employerProgramBeta,
  [ActiveCampaignListId.GeneralUpdates]: MarketingSubscriptionCode.generalUpdates,
  [ActiveCampaignListId.GroupAdmins]: MarketingSubscriptionCode.groupAdmins,
  [ActiveCampaignListId.GroupMembers]: MarketingSubscriptionCode.groupMembers,
  [ActiveCampaignListId.InternalTestGroup]: MarketingSubscriptionCode.internalTestGroup,
  [ActiveCampaignListId.MonthyNewsletters]: MarketingSubscriptionCode.monthlyNewsletters,
  [ActiveCampaignListId.Q2Payout]: MarketingSubscriptionCode.q2Payout,
};

export const InterestCategoryToMarketingSubscriptionCode = {
  [InterestCategory.EmployerBenefit]: MarketingSubscriptionCode.groupInterestsEmployerBenefit,
  [InterestCategory.NonProfit]: MarketingSubscriptionCode.groupInterestsNonProfit,
  [InterestCategory.SocialMediaCommunity]: MarketingSubscriptionCode.groupInterestsSocialMediaCommunity,
  [InterestCategory.Other]: MarketingSubscriptionCode.groupInterestsOther,
};
