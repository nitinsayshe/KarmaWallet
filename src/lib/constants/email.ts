// values for EmailTemplates should map to the directory names in /src/templates/email/
export enum EmailTemplateKeys {
  ContactUs = 'contactUs',
  AccountDeleteRequest = 'accountDeleteRequest',
  ACHTransferInitiation = 'achTransferInitiation',
  ACHTransferCancelled = 'achTransferCancelled',
  ACHTransferReturned = 'achTransferReturned',
  CashbackPayoutNotification = 'cashbackPayoutNotification',
  ChangePassword = 'changePassword',
  CreateAccountEmailReminder = 'createAccountEmailReminder',
  CreateAccountEmailVerification = 'createAccountEmailVerification',
  EarnedCashbackNotification = 'earnedCashbackNotification',
  EmployerGift = 'employerGift',
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
  DisputeReceivedNoProvisionalCreditIssued = 'disputeReceivedNoProvisionalCreditIssued',
  CardShipped = 'cardShipped',
  CaseLostProvisionalCreditNotAlreadyIssued = 'caseLostProvisionalCreditNotAlreadyIssued',
  KarmaCardDeclined = 'karmaCardDeclined',
  KarmaCardPendingReview = 'karmaCardPendingReview',
  ChangeEmailRequestVerification = 'changeEmailRequestVerification',
  ChangeEmailRequestAffirmation = 'changeEmailRequestAffirmation',
  ResumeKarmaCardApplication = 'resumeKarmaCardApplication',
  LowBalance = 'lowBalance',
  PayMembershipReminder = 'payMembershipReminder',
  KarmaCardManualApprove = 'karmaCardManualApprove',
}

export enum EmailTemplateTypes {
  AccountDeleteRequest = 'accountDeleteRequest',
  ACHTransferInitiation = 'achTransferInitiation',
  BankLinkedConfirmation = 'bankLinkedConfirmation',
  CashbackNotification = 'cashbackNotification',
  CreateAccountEmailReminder = 'createAccountEmailReminder',
  CreateAccountVerification = 'createAccountVerification',
  ContactUs = 'contactUs',
  Dispute = 'dispute',
  Essential = 'essential',
  Marketing = 'marketing',
  Password = 'password',
  Support = 'support',
  Verification = 'verification',
  EmployerGift = 'employerGift',
  KarmaCardDeclined = 'karmaCardDeclined',
  KarmaCardPendingReview = 'karmaCardPendingReview',
  ChangeEmailRequestVerification = 'changeEmailRequestVerification',
  ChangeEmailRequestAffirmation = 'changeEmailRequestAffirmation',
  LowBalance = 'lowBalance',
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
  ACHTransferCancelled: {
    name: EmailTemplateKeys.ACHTransferCancelled,
    type: EmailTemplateTypes.ACHTransferInitiation,
  },
  ACHTransferReturned: {
    name: EmailTemplateKeys.ACHTransferReturned,
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
    type: EmailTemplateTypes.CashbackNotification,
  },
  CashbackPayoutNotification: {
    name: EmailTemplateKeys.CashbackPayoutNotification,
    type: EmailTemplateTypes.CashbackNotification,
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
    type: EmailTemplateTypes.Support,
  },
  AccountDeleteRequest: {
    name: EmailTemplateKeys.AccountDeleteRequest,
    type: EmailTemplateTypes.Support,
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
  DisputeReceivedNoProvisionalCreditIssued: {
    name: EmailTemplateKeys.DisputeReceivedNoProvisionalCreditIssued,
    type: EmailTemplateTypes.Dispute,
  },
  CardShipped: {
    name: EmailTemplateKeys.CardShipped,
    type: EmailTemplateTypes.Essential,
  },
  CaseLostProvisionalCreditNotAlreadyIssued: {
    name: EmailTemplateKeys.CaseLostProvisionalCreditNotAlreadyIssued,
    type: EmailTemplateTypes.Dispute,
  },
  EmployerGift: {
    name: EmailTemplateKeys.EmployerGift,
    type: EmailTemplateTypes.EmployerGift,
  },
  KarmaCardDeclined: {
    name: EmailTemplateKeys.KarmaCardDeclined,
    type: EmailTemplateTypes.KarmaCardDeclined,
  },
  KarmaCardPendingReview: {
    name: EmailTemplateKeys.KarmaCardPendingReview,
    type: EmailTemplateTypes.KarmaCardPendingReview,
  },
  ContactUs: {
    name: EmailTemplateKeys.ContactUs,
    type: EmailTemplateTypes.ContactUs,
  },
  ChangeEmailRequestVerification: {
    name: EmailTemplateKeys.ChangeEmailRequestVerification,
    type: EmailTemplateTypes.ChangeEmailRequestVerification,
  },
  ChangeEmailRequestAffirmation: {
    name: EmailTemplateKeys.ChangeEmailRequestAffirmation,
    type: EmailTemplateTypes.ChangeEmailRequestAffirmation,
  },
  ResumeKarmaCardApplication: {
    name: EmailTemplateKeys.ResumeKarmaCardApplication,
    type: EmailTemplateTypes.Support,
  },
  LowBalance: {
    name: EmailTemplateKeys.LowBalance,
    type: EmailTemplateTypes.LowBalance,
  },
  PayMembershipReminder: {
    name: EmailTemplateKeys.PayMembershipReminder,
    type: EmailTemplateTypes.Support,
  },
  KarmaCardManualApprove: {
    name: EmailTemplateKeys.KarmaCardManualApprove,
    type: EmailTemplateTypes.Support,
  },
};

export const AWS_SES_LIMIT_PER_SECOND = 14;
export const AWS_SES_LIMIT_PER_DAY = 50000;
