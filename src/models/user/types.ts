import { ObjectId } from 'mongoose';
import { IComplyAdvantageIntegration } from '../../integrations/complyAdvantage/types';
import { IRef } from '../../types/model';
import { IPromo, IPromoDocument } from '../promo';
import { IMarqetaUserIntegrations } from '../../integrations/marqeta/types';
import { IWPArticle } from '../wpArticle';

export enum UserEmailStatus {
  Unverified = 'unverified',
  Verified = 'verified',
  Bounced = 'bounced',
  Complained = 'complained',
}

// TODO: remove alt emails after mapping
export interface IAltEmail {
  email: string;
  status: UserEmailStatus;
}

export interface IEmail {
  email: string;
  status: UserEmailStatus;
  primary: boolean;
  bouncedDate?: Date;
}

export interface IRareUserIntegration {
  userId?: string;
}

export interface IShareASale {
  trackingId?: string;
  xTypeParam?: string;
  sscid?: string;
  sscidCreatedOn: string;
}

export interface IActiveCampaignUserIntegration {
  userId: string;
  latestSync: Date;
}

export interface IUrlParam {
  key: string;
  value: string;
}

export interface IPaypalUserIntegration {
  user_id: string;
  sub: string;
  name: string;
  middle_name: string;
  email: string;
  verified: Boolean;
  payerId: string;
  verified_account: Boolean;
  email_verified: Boolean;
}

export interface IReferrals {
  params: IUrlParam[];
}

export interface IBiometrics {
  _id?: string;
  biometricKey: string;
  isBiometricEnabled: Boolean;
}

export interface IFCMTokenIntegration {
  token: string;
  deviceId: string;
}

export interface IUserIntegrations {
  rare?: IRareUserIntegration;
  paypal?: IPaypalUserIntegration;
  activecampaign?: IActiveCampaignUserIntegration;
  shareasale?: IShareASale;
  referrals?: IReferrals;
  promos?: IRef<ObjectId, IPromo | IPromoDocument>[];
  biometrics?: IBiometrics[];
  marqeta?: IMarqetaUserIntegrations;
  fcm?: IFCMTokenIntegration[];
  complyAdvantage?: IComplyAdvantageIntegration;
}

export interface IShareableUser {
  email: string;
  name: string;
  dateJoined: Date;
  zipcode: string;
  role: string; // cannot mark as UserRoles due to how mongoose treats enums
  legacyId: string;
}

export interface IDeviceInfo {
  manufacturer: string;
  bundleId: string;
  deviceId: string;
  apiLevel: string;
  applicaitonName: string;
  model: string;
  buildNumber: string;
}

export interface IUser extends IShareableUser {
  emails: IEmail[];
  // TODO: remove alt emails after mapping
  altEmails: IAltEmail[];
  password: string;
  lastModified: Date;
  integrations?: IUserIntegrations;
  isTestIdentity?: boolean;
  isAutoGeneratedPassword?: boolean;
  articles?: {
    queued?: {
      date: Date;
      article: IRef<ObjectId, IWPArticle>;
    }[];
  };
  deviceInfo?:IDeviceInfo[]
}
