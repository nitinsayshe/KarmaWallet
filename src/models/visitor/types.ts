import { ObjectId } from 'mongoose';
import { IMarqetaKycState, IMarqetaUserStatus } from '../../integrations/marqeta/user/types';
import { IPersonaIntegration } from '../../integrations/persona/types';
import { IRef } from '../../types/model';
import { IUrlParam, UserEmailStatus, IShareableUser, IUser } from '../user/types';

interface IMarqetaKycResult {
  status: IMarqetaKycState;
  codes: string[];
}

interface IMarqetaIdentification {
  type: string;
  value: string;
}

export const VisitorActionEnum = {
  PendingApplication: 'pendingApplication',
  AppliedForCard: 'appliedForCard',
  ApplicationDeclined: 'applicationDeclined',
} as const;
export type VisitorActionEnumValues = typeof VisitorActionEnum[keyof typeof VisitorActionEnum];

export interface IMarqetaVisitorData {
  userToken: string;
  email: string;
  kycResult: IMarqetaKycResult;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  account_holder_group_token?: string;
  identifications?: IMarqetaIdentification[];
  status?: IMarqetaUserStatus;
  created_time?: string;
}

export interface IVisitorIntegrations {
  groupCode?: string;
  urlParams?: IUrlParam[];
  shareASale?: {
    sscid?: string;
    xTypeParam?: string;
    sscidCreatedOn?: string;
    trackingId?: string;
  };
  marqeta?: IMarqetaVisitorData;
  persona?: IPersonaIntegration;
}

export interface IVisitorAction {
  type: VisitorActionEnumValues;
  createdOn: Date;
}

export interface IShareableVisitor {
  email: string;
  emailStatus: UserEmailStatus;
  integrations?: IVisitorIntegrations;
  statusLastModified: Date;
  createdOn: Date;
}

export interface IVisitor extends IShareableVisitor {
  user?: IRef<ObjectId, (IShareableUser | IUser)>;
  actions?: IVisitorAction[];
}
