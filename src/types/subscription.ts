export enum SubscriptionProvider {
  ActiveCampaign = 'activeCampaign',
}

export enum SubscriptionStatus {
  Active = 'active',
  Inactive = 'inactive',
  Cancelled = 'cancelled',
}

// NOTE: if these lists are changed in Active Campaign, This code needs to be
// updated accordingly.
export enum ActiveCampaignListId {
  // "Account Updates" will be where new users, who sign up and create an
  // account, should be added to
  AccountUpdates = '1',
  // "Monthly Newsletters" will be the non-users who sign up via the footer
  MonthyNewsletters = '2',
  // "General Updates" is going to be the master list that includes both
  GeneralUpdates = '3',
}

export enum ProviderProductName {
  AccountUpdates = 'Account Updates',
  MonthlyNewsletters = 'Monthly Newsletters',
  GeneralUpdates = 'General Updates',
}

export enum SubscriptionCode {
  accountUpdates = 'accountUpdates',
  monthlyNewsletters = 'monthlyNewsletters',
  generalUpdates = 'generalUpdates',
}
