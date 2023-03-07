// values for EmailTemplates should map to the directory names in /src/templates/email/
export enum EmailTemplateKeys {
  CreateAccountEmailVerification = 'createAccountEmailVerification',
  GroupVerification = 'groupVerification',
  EmailVerification = 'emailVerification',
  Welcome = 'welcome',
  WelcomeGroup = 'welcomeGroup',
  WelcomeCC1 = 'welcomeCC1',
  WelcomeCCG1 = 'welcomeCCG1',
  TransactionsProcessed = 'transactionsProcessed',
  PasswordReset = 'passwordReset',
}

export enum EmailTemplateTypes {
  Marketing = 'marketing',
  Password = 'password',
  Verification = 'verification',
  CreateAccountVerification = 'createAccountVerification',
  Essential = 'essential',
}

export interface IEmailTemplateConfig {
  name: EmailTemplateKeys;
  type: EmailTemplateTypes;
}

export const EmailTemplateConfigs: {[key: string]: IEmailTemplateConfig} = {
  PasswordReset: {
    name: EmailTemplateKeys.PasswordReset,
    type: EmailTemplateTypes.Essential,
  },
  GroupVerification: {
    name: EmailTemplateKeys.GroupVerification,
    type: EmailTemplateTypes.Verification,
  },
  CreateAccountEmailVerification: {
    name: EmailTemplateKeys.CreateAccountEmailVerification,
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
};

export const AWS_SES_LIMIT_PER_SECOND = 14;
export const AWS_SES_LIMIT_PER_DAY = 50000;
