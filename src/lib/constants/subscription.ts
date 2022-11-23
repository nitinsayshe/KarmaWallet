import { SubscriptionCode, ActiveCampaignListId, ProviderProductName } from '../../types/subscription';

export const SubscriptionCodeToProviderProductName = {
  [SubscriptionCode.accountUpdates]: ProviderProductName.AccountUpdates,
  [SubscriptionCode.monthlyNewsletters]: ProviderProductName.MonthlyNewsletters,
  [SubscriptionCode.generalUpdates]: ProviderProductName.GeneralUpdates,
};

export const SubscriptionCodeToProviderProductId = {
  [SubscriptionCode.accountUpdates]: ActiveCampaignListId.AccountUpdates,
  [SubscriptionCode.monthlyNewsletters]: ActiveCampaignListId.MonthyNewsletters,
  [SubscriptionCode.generalUpdates]: ActiveCampaignListId.GeneralUpdates,
};
