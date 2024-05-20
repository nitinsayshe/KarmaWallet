import { InterestCategory } from '../../integrations/hubspot';
import { SubscriptionCode, ActiveCampaignListId, HubspotFormId } from '../../types/subscription';

export const SubscriptionCodeToProviderProductId = {
  [SubscriptionCode.accountUpdates]: ActiveCampaignListId.AccountUpdates,
  [SubscriptionCode.betaTesterInvite]: ActiveCampaignListId.BetaTesterInvite,
  [SubscriptionCode.betaTesters]: ActiveCampaignListId.BetaTesters,
  [SubscriptionCode.brandContacts]: ActiveCampaignListId.BrandContacts,
  [SubscriptionCode.debitCardHolders]: ActiveCampaignListId.DebitCardHolders,
  [SubscriptionCode.debitCardWaitlist]: ActiveCampaignListId.DebitCardWaitlist,
  [SubscriptionCode.employerProgramBeta]: ActiveCampaignListId.EmployerProgramBeta,
  [SubscriptionCode.generalUpdates]: ActiveCampaignListId.GeneralUpdates,
  [SubscriptionCode.groupAdmins]: ActiveCampaignListId.GroupAdmins,
  [SubscriptionCode.groupInterestsEmployerBenefit]: HubspotFormId.groupsInterest,
  [SubscriptionCode.groupInterestsNonProfit]: HubspotFormId.groupsInterest,
  [SubscriptionCode.groupInterestsOther]: HubspotFormId.groupsInterest,
  [SubscriptionCode.groupInterestsSocialMediaCommunity]: HubspotFormId.groupsInterest,
  [SubscriptionCode.groupMembers]: ActiveCampaignListId.GroupMembers,
  [SubscriptionCode.internalTestGroup]: ActiveCampaignListId.InternalTestGroup,
  [SubscriptionCode.monthlyNewsletters]: ActiveCampaignListId.MonthyNewsletters,
  [SubscriptionCode.q2Payout]: ActiveCampaignListId.Q2Payout,
  [SubscriptionCode.doneGood]: ActiveCampaignListId.DoneGood,
};

export const ProviderProductIdToSubscriptionCode = {
  [ActiveCampaignListId.AccountUpdates]: SubscriptionCode.accountUpdates,
  [ActiveCampaignListId.BetaTesterInvite]: SubscriptionCode.betaTesterInvite,
  [ActiveCampaignListId.BetaTesters]: SubscriptionCode.betaTesters,
  [ActiveCampaignListId.BrandContacts]: SubscriptionCode.brandContacts,
  [ActiveCampaignListId.DebitCardHolders]: SubscriptionCode.debitCardHolders,
  [ActiveCampaignListId.DebitCardWaitlist]: SubscriptionCode.debitCardWaitlist,
  [ActiveCampaignListId.EmployerProgramBeta]: SubscriptionCode.employerProgramBeta,
  [ActiveCampaignListId.GeneralUpdates]: SubscriptionCode.generalUpdates,
  [ActiveCampaignListId.GroupAdmins]: SubscriptionCode.groupAdmins,
  [ActiveCampaignListId.GroupMembers]: SubscriptionCode.groupMembers,
  [ActiveCampaignListId.InternalTestGroup]: SubscriptionCode.internalTestGroup,
  [ActiveCampaignListId.MonthyNewsletters]: SubscriptionCode.monthlyNewsletters,
  [ActiveCampaignListId.Q2Payout]: SubscriptionCode.q2Payout,
  [ActiveCampaignListId.DoneGood]: SubscriptionCode.doneGood,
};

export const InterestCategoryToSubscriptionCode = {
  [InterestCategory.EmployerBenefit]: SubscriptionCode.groupInterestsEmployerBenefit,
  [InterestCategory.NonProfit]: SubscriptionCode.groupInterestsNonProfit,
  [InterestCategory.SocialMediaCommunity]: SubscriptionCode.groupInterestsSocialMediaCommunity,
  [InterestCategory.Other]: SubscriptionCode.groupInterestsOther,
};
