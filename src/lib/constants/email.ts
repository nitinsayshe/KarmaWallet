// values for EmailTemplates should map to the directory names in /src/templates/email/
export enum EmailTemplateKeys {
  AccountDeleteRequest = 'accountDeleteRequest',
  ACHTransferInitiation = 'achTransferInitiation',
  CashbackPayoutNotification = 'cashbackPayoutNotification',
  ChangePassword = 'changePassword',
  CreateAccountEmailReminder = 'createAccountEmailReminder',
  CreateAccountEmailVerification = 'createAccountEmailVerification',
  EarnedCashbackNotification = 'earnedCashbackNotification',
  EmailVerification = 'emailVerification',
  GroupVerification = 'groupVerification',
  NoChargebackRights = 'noChargebackRights',
  PasswordReset = 'passwordReset',
  SupportTicket = 'supportTicket',
  TransactionsProcessed = 'transactionsProcessed',
  Welcome = 'welcome',
  WelcomeCC1 = 'welcomeCC1',
  WelcomeCCG1 = 'welcomeCCG1',
  CaseWonProvisionalCreditAlreadyIssued = 'caseWonProvisionalCreditAlreadyIssued',
  WelcomeGroup = 'welcomeGroup',
  KarmaCardWelcome = 'karmaCardWelcome',
  CaseLostProvisionalCreditAlreadyIssued = 'caseLostProvisionalCreditAlreadyIssued',
  ProvisionalCreditIssued = 'provisionalCreditIssued',
  BankLinkedConfirmation = 'bankLinkedConfirmation',
  CaseWonProvisionalCreditNotAlreadyIssued = 'caseWonProvisionalCreditNotAlreadyIssued',
}

export enum EmailTemplateTypes {
  AccountDeleteRequest = 'accountDeleteRequest',
  ACHTransferInitiation = 'achTransferInitiation',
  BankLinkedConfirmation = 'bankLinkedConfirmation',
  CashbackNotificaiton = 'cashbackNotification',
  CreateAccountEmailReminder = 'createAccountEmailReminder',
  CreateAccountVerification = 'createAccountVerification',
  Dispute = 'dispute',
  Essential = 'essential',
  Marketing = 'marketing',
  Password = 'password',
  SupportTicket = 'supportTicket',
  Verification = 'verification',
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
  NoChargebackRights: {
    name: EmailTemplateKeys.NoChargebackRights,
    type: EmailTemplateTypes.Dispute,
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
  CaseWonProvisionalCreditAlreadyIssued: {
    name: EmailTemplateKeys.CaseWonProvisionalCreditAlreadyIssued,
    type: EmailTemplateTypes.Dispute,
  },
  CaseWonProvisionalCreditNotAlreadyIssued: {
    name: EmailTemplateKeys.CaseWonProvisionalCreditNotAlreadyIssued,
    type: EmailTemplateTypes.Dispute,
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
  CaseLostProvisionalCreditAlreadyIssued: {
    name: EmailTemplateKeys.CaseLostProvisionalCreditAlreadyIssued,
    type: EmailTemplateTypes.Dispute,
  },
  ProvisionalCreditIssued: {
    name: EmailTemplateKeys.ProvisionalCreditIssued,
    type: EmailTemplateTypes.Dispute,
  },
  BankLinkedConfirmation: {
    name: EmailTemplateKeys.BankLinkedConfirmation,
    type: EmailTemplateTypes.BankLinkedConfirmation,
  },
};

export const AWS_SES_LIMIT_PER_SECOND = 14;
export const AWS_SES_LIMIT_PER_DAY = 50000;
