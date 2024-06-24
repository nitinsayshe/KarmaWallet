import { Types } from 'mongoose';
import { EmailTemplateKeys, EmailTemplateTypes, IEmailTemplateConfig } from '../../lib/constants/email';
import { IUserDocument } from '../../models/user';
import { IVisitorDocument } from '../../models/visitor';
import { IMarqetaKycState } from '../../integrations/marqeta/user/types';

interface IBaseEmailParams {
  domain?: string;
  recipientEmail?: string;
  replyToAddresses?: string[];
  senderEmail?: string;
  sendEmail?: boolean;
  name?: string;
}

export interface ICreateSentEmailParams {
  key: EmailTemplateKeys;
  email: string;
  user?: Types.ObjectId;
  visitor?: Types.ObjectId;
}

export interface IACHTransferEmailData {
  user: IUserDocument;
  amount: string;
  accountMask: string;
  accountType: string;
  date: string;
  name?: string;
  reason?: string;
}

export interface IKarmaCardUpdateData {
  name?: string;
  user?: IUserDocument;
  visitor?: IVisitorDocument;
}

export interface IKarmaCardDeclinedData extends IKarmaCardUpdateData, IBaseEmailParams {
  resubmitDocumentsLink: string;
  applicationExpirationDate: string;
}

export interface IKarmaCardUpdateEmailData extends IKarmaCardUpdateData, IBaseEmailParams { }
export interface IKarmaCardDeclinedEmailData extends IKarmaCardDeclinedData, IBaseEmailParams { }

interface IEmailTemplateParams extends IBaseEmailParams {
  user?: Types.ObjectId;
  amount?: string;
}

export interface IEmployerGiftEmailData extends IBaseEmailParams {
  user: IUserDocument;
  name: string;
  amount: string;
}

export interface IDisputeEmailData extends IBaseEmailParams {
  user: IUserDocument;
  reason?: string;
  amount?: string;
  companyName?: string;
  date?: string;
  reversalDate?: string;
}

export interface IDeleteAccountRequestVerificationTemplateParams {
  domain?: string;
  user: IUserDocument;
  deleteReason: string;
  deleteAccountRequestId: string;
  recipientEmail?: string;
  replyToAddresses?: string[];
  senderEmail?: string;
  message?: string;
}

export interface IWelcomeGroupTemplateParams extends IEmailTemplateParams {
  groupName: string;
}

export interface IKarmacardWelcomeTemplateParams extends IEmailTemplateParams {
  newUser: boolean;
}

export interface IEmailVerificationTemplateParams extends IEmailTemplateParams {
  token: string;
  groupName?: string;
  visitor?: IVisitorDocument;
  companyName?: string;
  amount?: string;
  merchantName?: string;
  submittedClaimDate?: string;
}

export interface IContactUsEmail {
  department?: string;
  visitor?: string | IVisitorDocument | Types.ObjectId;
  user?: string;
  recipientEmail?: string;
  senderEmail?: string;
  replyToAddresses?: string[];
  message: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  topic: string;
}

export interface ISupportEmailVerificationTemplateParams {
  domain?: string;
  message: string;
  replyToAddresses?: string[];
  senderEmail?: string;
  user: IUserDocument;
  supportTicketId: string;
  recipientEmail?: string;
}

export interface IGroupVerificationTemplateParams extends IEmailVerificationTemplateParams {
  groupName: string;
}

export interface IPopulateEmailTemplateRequest extends IEmailVerificationTemplateParams {
  template: EmailTemplateKeys;
}

export interface IEmailJobData {
  acceptedDocuments?: string[];
  accountMask?: string;
  accountType?: string;
  amount?: string;
  companyName?: string;
  currentYear?: string;
  date?: string;
  department?: string;
  deleteAccountRequestId?: string;
  deleteReason?: string;
  domain?: string;
  emailTemplateConfig?: IEmailTemplateConfig;
  footerStyle?: string;
  groupName?: string;
  instituteName?: string;
  isSuccess?: boolean;
  kycStatus?: IMarqetaKycState;
  lastDigitsOfBankAccountNumber?: string;
  message?: string;
  name?: string;
  newUser?: boolean;
  passwordResetLink?: string;
  phone?: string;
  reason?: string;
  recipientEmail: string;
  replyToAddresses: string[];
  reversalDate?: string;
  senderEmail: string;
  solutionText?: string;
  style?: string;
  subject: string;
  supportTicketId?: string;
  template: string;
  templateStyle?: string;
  token?: string;
  user?: Types.ObjectId | string;
  userEmail?: string;
  userId?: string;
  verificationLink?: string;
  affirmationLink?: string;
  link?: string;
  visitor?: IVisitorDocument | Types.ObjectId | string;
  resubmitDocumentsLink?: string;
  applicationExpirationDate?: string;
}

export interface IBuildTemplateParams {
  templateName: EmailTemplateKeys;
  data: Partial<IEmailJobData>;
  templatePath?: string;
  stylePath?: string;
  templateType?: EmailTemplateTypes;
}

export interface ISendTransactionsProcessedEmailParams extends IEmailTemplateParams {
  isSuccess: boolean;
}

export interface IBankLinkedConfirmationEmailTemplate extends IEmailTemplateParams {
  instituteName: string;
  lastDigitsOfBankAccountNumber: string
}

export interface IResumeKarmaCardApplicationEmail extends IBaseEmailParams {
  visitor?: IVisitorDocument;
  user?: IUserDocument;
  link: string;
  name: string;
  applicationExpirationDate: string;
}

export interface IChangeEmailConfirmationParams {
  domain?: string;
  user?: Types.ObjectId | string;
  name: string;
  recipientEmail: string;
  token: string;
  sendEmail?: boolean;
  replyToAddresses?: string[];
  senderEmail?: string;
}

export interface IChangeEmailAffirmationParams {
  domain?: string;
  user?: Types.ObjectId | string;
  name: string;
  recipientEmail: string;
  token: string;
  sendEmail?: boolean;
  replyToAddresses?: string[];
  senderEmail?: string;
}

export interface IPayMembershipReminderEmailData extends IBaseEmailParams {
  link: string;
  recipientEmail: string;
  name: string;
  user?: IUserDocument;
}
