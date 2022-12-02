import { InterestCategory } from '../../integrations/hubspot';
import { SubscriptionCode, ActiveCampaignListId, ProviderProductName, HubspotFormId } from '../../types/subscription';

export const SubscriptionCodeToProviderProductName = {
  [SubscriptionCode.accountUpdates]: ProviderProductName.AccountUpdates,
  [SubscriptionCode.monthlyNewsletters]: ProviderProductName.MonthlyNewsletters,
  [SubscriptionCode.generalUpdates]: ProviderProductName.GeneralUpdates,
};

export const SubscriptionCodeToProviderProductId = {
  [SubscriptionCode.accountUpdates]: ActiveCampaignListId.AccountUpdates,
  [SubscriptionCode.monthlyNewsletters]: ActiveCampaignListId.MonthyNewsletters,
  [SubscriptionCode.generalUpdates]: ActiveCampaignListId.GeneralUpdates,
  [SubscriptionCode.groupInterestsEmplpyerBenefit]: HubspotFormId.groupsInterest,
  [SubscriptionCode.groupInterestsNonProfit]: HubspotFormId.groupsInterest,
  [SubscriptionCode.groupInterestsSocialMediaCommunity]: HubspotFormId.groupsInterest,
  [SubscriptionCode.groupInterestsOther]: HubspotFormId.groupsInterest,
};

export const ProviderProductIdToSubscriptionCode = {
  [ActiveCampaignListId.AccountUpdates]: SubscriptionCode.accountUpdates,
  [ActiveCampaignListId.MonthyNewsletters]: SubscriptionCode.monthlyNewsletters,
  [ActiveCampaignListId.GeneralUpdates]: SubscriptionCode.generalUpdates,
};

export const InterestCategoryToSubscriptionCode = {
  [InterestCategory.EmployerBenefit]: SubscriptionCode.groupInterestsEmplpyerBenefit,
  [InterestCategory.NonProfit]: SubscriptionCode.groupInterestsNonProfit,
  [InterestCategory.SocialMediaCommunity]: SubscriptionCode.groupInterestsSocialMediaCommunity,
  [InterestCategory.Other]: SubscriptionCode.groupInterestsOther,
};
