// values for EmailTemplates should map to the directory names in /src/templates/email/
export enum EmailTemplates {
  GroupVerification = 'groupVerification',
  EmailVerification = 'emailVerification',
  Welcome = 'welcome',
  WelcomeGroup = 'welcomeGroup',
  WelcomeCC1 = 'welcomeCC1',
  WelcomeCCG1 = 'welcomeCCG1',
}

export const AWS_SES_LIMIT_PER_SECOND = 14;
export const AWS_SES_LIMIT_PER_DAY = 50000;
