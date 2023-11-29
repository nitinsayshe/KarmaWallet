import { Types } from 'mongoose';
import { EmailTemplateKeys, EmailTemplateTypes, IEmailTemplateConfig } from '../../lib/constants/email';
import { IUserDocument } from '../../models/user';
import { IVisitorDocument } from '../../models/visitor';

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
}

interface IBaseEmailParams {
  domain?: string;
  recipientEmail?: string;
  replyToAddresses?: string[];
  senderEmail?: string;
  sendEmail?: boolean;
  name: string;
}

interface IEmailTemplateParams extends IBaseEmailParams {
  user?: Types.ObjectId;
  amount?: string;
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
  accountMask?: string;
  accountType?: string;
  amount?: string;
  companyName?: string;
  currentYear?: string;
  date?: string;
  reversalDate?: string;
  deleteAccountRequestId?: string;
  deleteReason?: string;
  reason?: string;
  domain?: string;
  emailTemplateConfig?: IEmailTemplateConfig;
  footerStyle?: string;
  groupName?: string;
  isSuccess?: boolean;
  message?: string;
  name?: string;
  newUser?: boolean;
  passwordResetLink?: string;
  recipientEmail: string;
  replyToAddresses: string[];
  senderEmail: string;
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
  visitor?: IVisitorDocument | Types.ObjectId | string;
  instituteName?: string;
  lastDigitsOfBankAccountNumber?: string;
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
