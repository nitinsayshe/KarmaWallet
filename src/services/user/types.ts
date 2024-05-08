import { UserRoles } from '../../lib/constants';
import { DeleteRequestReason } from '../../models/deleteAccountRequest';
import { ILegacyUserDocument } from '../../models/legacyUser';
import { IUserDocument } from '../../models/user';
import { IUserIntegrations } from '../../models/user/types';
import { IVisitorDocument } from '../../models/visitor';
import { IRequest } from '../../types/request';

export interface IVerifyTokenBody {
  token: string;
}

export interface IGetPersonaData {
  email: string;
}

export interface IEmail {
  email: string;
}

export interface ILoginData {
  email: string;
  password?: string;
  biometricSignature?: string;
  token?: string;
  fcmToken: string;
  deviceInfo?: {
    manufacturer: string,
    bundleId: string,
    deviceId: string,
    apiLevel: string,
    applicaitonName: string,
    model: string,
    buildNumber: string,
  };
}

export interface IEntityData {
  type: 'user' | 'visitor';
  data: IUserDocument | IVisitorDocument;
}

export interface IUpdatePasswordBody {
  newPassword: string;
  password: string;
}

export interface IUrlParam {
  key: string;
  value: string;
}

export interface IUserData extends ILoginData {
  name: string;
  zipcode?: string;
  role?: UserRoles;
  promo?: string;
  pw?: string;
  shareASaleId?: boolean;
  referralParams?: IUrlParam[];
  integrations?: IUserIntegrations;
}
export interface IRegisterUserData {
  name: string;
  token?: string;
  visitorId?: string;
  password: string;
  promo?: string;
  zipcode?: string;
  isAutoGenerated?: boolean;
  integrations?: IUserIntegrations;
}

export interface IEmailVerificationData {
  email: string;
  code: string;
  tokenValue: string;
}

export interface IUpdateUserEmailParams {
  user: IUserDocument;
  email: string;
  legacyUser: ILegacyUserDocument;
  req: IRequest;
  pw: string;
}

export type UserKeys = keyof IUserData;

export interface IDeleteAccountRequest {
  reason: DeleteRequestReason;
}
