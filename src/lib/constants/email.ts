// values for EmailTemplates should map to the directory names in /src/templates/email/
export enum EmailTemplateKeys {
  CreateAccountEmailVerification = 'createAccountEmailVerification',
  CreateAccountEmailReminder = 'createAccountEmailReminder',
  GroupVerification = 'groupVerification',
  EmailVerification = 'emailVerification',
  Welcome = 'welcome',
  WelcomeGroup = 'welcomeGroup',
  WelcomeCC1 = 'welcomeCC1',
  WelcomeCCG1 = 'welcomeCCG1',
  TransactionsProcessed = 'transactionsProcessed',
  PasswordReset = 'passwordReset',
  ChangePassword = 'changePassword',
  EarnedCashbackNotification = 'earnedCashbackNotification',
  CashbackPayoutNotification = 'cashbackPayoutNotification',
  SupportTicket = 'supportTicket',
  AccountDeleteRequest = 'accountDeleteRequest',
  ACHTransferInitiation = 'achTransferInitiation',
  KarmaCardWelcome = 'karmaCardWelcome',
}

export enum EmailTemplateTypes {
  Marketing = 'marketing',
  Password = 'password',
  Verification = 'verification',
  CreateAccountVerification = 'createAccountVerification',
  CreateAccountEmailReminder = 'createAccountEmailReminder',
  Essential = 'essential',
  CashbackNotificaiton = 'cashbackNotification',
  SupportTicket = 'supportTicket',
  AccountDeleteRequest = 'accountDeleteRequest',
  ACHTransferInitiation = 'achTransferInitiation',
}

export interface IEmailTemplateConfig {
  name: EmailTemplateKeys;
  type: EmailTemplateTypes;
}

export const EmailTemplateConfigs: { [key: string]: IEmailTemplateConfig } = {
  ACHTransferInitiation: {
    name: EmailTemplateKeys.ACHTransferInitiation,
    type: EmailTemplateTypes.ACHTransferInitiation,
  },
  PasswordReset: {
    name: EmailTemplateKeys.PasswordReset,
    type: EmailTemplateTypes.Essential,
  },
  // email to prompt user to change password after user account auto-created
  ChangePassword: {
    name: EmailTemplateKeys.ChangePassword,
    type: EmailTemplateTypes.Verification,
  },
  GroupVerification: {
    name: EmailTemplateKeys.GroupVerification,
    type: EmailTemplateTypes.Verification,
  },
  CreateAccountEmailVerification: {
    name: EmailTemplateKeys.CreateAccountEmailVerification,
    type: EmailTemplateTypes.Verification,
  },
  CreateAccountEmailReminder: {
    name: EmailTemplateKeys.CreateAccountEmailReminder,
    type: EmailTemplateTypes.Verification,
  },
  EmailVerification: {
    name: EmailTemplateKeys.EmailVerification,
    type: EmailTemplateTypes.Verification,
  },
  Welcome: {
    name: EmailTemplateKeys.Welcome,
    type: EmailTemplateTypes.Essential,
  },
  WelcomeGroup: {
    name: EmailTemplateKeys.WelcomeGroup,
    type: EmailTemplateTypes.Essential,
  },
  WelcomeCC1: {
    name: EmailTemplateKeys.WelcomeCC1,
    type: EmailTemplateTypes.Essential,
  },
  WelcomeCCG1: {
    name: EmailTemplateKeys.WelcomeCCG1,
    type: EmailTemplateTypes.Essential,
  },
  TransactionsProcessed: {
    name: EmailTemplateKeys.TransactionsProcessed,
    type: EmailTemplateTypes.Essential,
  },
  EarnedCashbackReward: {
    name: EmailTemplateKeys.EarnedCashbackNotification,
    type: EmailTemplateTypes.CashbackNotificaiton,
  },
  CashbackPayoutNotification: {
    name: EmailTemplateKeys.CashbackPayoutNotification,
    type: EmailTemplateTypes.CashbackNotificaiton,
  },
  SupportTicket: {
    name: EmailTemplateKeys.SupportTicket,
    type: EmailTemplateTypes.SupportTicket,
  },
  AccountDeleteRequest: {
    name: EmailTemplateKeys.AccountDeleteRequest,
    type: EmailTemplateTypes.AccountDeleteRequest,
  },
  KarmaCardWelcome: {
    name: EmailTemplateKeys.KarmaCardWelcome,
    type: EmailTemplateTypes.Essential,
  },
};

export const AWS_SES_LIMIT_PER_SECOND = 14;
export const AWS_SES_LIMIT_PER_DAY = 50000;
