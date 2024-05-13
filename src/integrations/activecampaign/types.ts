import { Types } from 'mongoose';
import { SubscriptionCode } from '../../types/subscription';

export interface ICreateContactData {
  email: string;
  firstName?: string;
  lastName?: string;
  fieldValues?: Array<{ field: string; value: string }>;
  phone?: string;
}

export interface IUpdateContactData {
  id: number;
  contact: Partial<ICreateContactData>;
}

export const UpdateContactListStatusEnum = {
  subscribe: 1,
  unsubscribe: 2,
} as const;

export interface IGetContactsData {
  ids?: string; // could be repeated for multiple ids (e.g. ids[]=1&ids[]=2&ids[]=3)
  email?: string;
  email_like?: string; // filters for emails containing this value
  exclude?: number; // exclude the id provided here
  id_greater?: number; // only include ids greater than this value
  id_less?: number; // only include ids less than this value
  listid?: string; // only include contacts in this list
  search?: string; // search for contacts with this value in their name, organization email, or phone number
  seriesid?: number; // filters contacts associates with the given automation
  status?: number; // filters contacts by status (1 = subscribed, 2 = unsubscribed, 3 = bounced, 4 = inactive)
  tagid?: number; // filters contacts by tag
}

export interface ICallbackData {
  url: string;
  requestType: string;
  detailed_results?: boolean; // get success/failure messages for each contact
  params?: Array<{ key: string; value: string }>;
  headers?: Array<{ key: string; value: string }>;
}

export interface IContactAutomation {
  contact?: string; // contact id
  seriesid?: string;
  startid?: string;
  status?: string;
  bathid?: string; // TODO: restrict to an enum
  automation?: string; // automation id
  adddate?: string;
  remdate?: string | null;
  timespan?: string | null;
  lastblock?: string;
  lastlogid?: string;
  lastdate?: string;
  in_als?: string;
  completedElements?: number;
  totalElements?: number;
  completed?: number;
  completeValue?: number;
  links?: {
    automation: string;
    contact: string;
    contactGoals: string;
    automationLogs: string;
  };
  id?: string;
}

// Define types for each entity in the JSON response

export interface IContactList {
  // Contact List
  contact?: string;
  list?: string;
  form?: string | null;
  seriesid?: string;
  sdate?: string | null;
  udate?: string | null;
  status?: string;
  responder?: string;
  sync?: string;
  unsubreason?: string | null;
  campaign?: string | null;
  message?: string | null;
  first_name?: string;
  last_name?: string;
  ip4Sub?: string;
  sourceid?: string;
  autosyncLog?: string | null;
  ip4_last?: string;
  ip4Unsub?: string;
  unsubscribeAutomation?: string | null;
  links?: {
    automation?: string;
    list?: string;
    contact?: string;
    form?: string;
    autosyncLog?: string;
    campaign?: string;
    unsubscribeAutomation?: string;
    message?: string;
  };
  id?: string;
  automation?: string | null;
}

// Deal
interface IDeal {
  owner: string;
  contact: string;
  organization: string | null;
  group: string | null;
  title: string;
  nexttaskid: string;
  currency: string;
  status: string;
  links: {
    activities: string;
    contact: string;
    contactDeals: string;
    group: string;
    nextTask: string;
    notes: string;
    organization: string;
    owner: string;
    scoreValues: string;
    stage: string;
    tasks: string;
  };
  id: string;
  nextTask: string | null;
}

// Field Value
interface IFieldValue {
  contact: string;
  field: string;
  value: string | null;
  cdate: string;
  udate: string;
  links: {
    owner: string;
    field: string;
  };
  id: string;
  owner: string;
}

// Geo Address
interface IGeoAddress {
  ip4: string;
  country2: string;
  country: string;
  state: string;
  city: string;
  zip: string;
  area: string;
  lat: string;
  lon: string;
  tz: string;
  tstamp: string;
  links: never[]; // This seems to be an empty array in the provided JSON
  id: string;
}

// Geo IP
export interface IGeoIp {
  contact: string;
  campaignid: string;
  messageid: string;
  geoaddrid: string;
  ip4: string;
  tstamp: string;
  geoAddress: string;
  links: {
    geoAddress: string;
  };
  id: string;
}

// Contact
export interface IContact {
  cdate?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  orgid?: string;
  segmentio_id?: string;
  bounced_hard?: string;
  bounced_soft?: string;
  bounced_date?: string | null;
  ip?: string;
  ua?: string | null;
  hash?: string;
  socialdata_lastcheck?: string | null;
  email_local?: string;
  email_domain?: string;
  sentcnt?: string;
  rating_tstamp?: string | null;
  gravatar?: string;
  deleted?: string;
  adate?: string | null;
  udate?: string | null;
  edate?: string | null;
  contactAutomations?: string[];
  contactLists?: string[];
  fieldValues?: string[];
  geoIps?: string[];
  deals?: string[];
  accountContacts?: string[];
  links?: {
    bounceLogs?: string;
    contactAutomations?: string;
    contactData?: string;
    contactGoals?: string;
    contactLists?: string;
    contactLogs?: string;
    contactTags?: string;
    contactDeals?: string;
    deals?: string;
    fieldValues?: string;
    geoIps?: string;
    notes?: string;
    organization?: string;
    plusAppend?: string;
    trackingLogs?: string;
    scoreValues?: string;
  };
  id: string;
  organization?: string | null;
}

// Complete Response Type
export interface IGetContactResponse {
  contactAutomations: IContactAutomation[];
  contactLists: IContactList[];
  deals: IDeal[];
  fieldValues: IFieldValue[];
  geoAddresses: IGeoAddress[];
  geoIps: IGeoIp[];
  contact: IContact;
}

export interface ContactListUpdateRequest {
  contactList: {
    contact: number;
    list: number;
    status: number;
  };
}

export interface Metadata {
  total: string;
}

export interface IGetContactsResponse {
  contacts: Array<IContact>;
  meta: Metadata;
}

// NOTE: if these lists are changed in Active Campaign, This code needs to be
// updated accordingly.
export enum ActiveCampaignListId {
  AccountUpdates = '1', // "Account Updates" will be where new users, who sign up and create an account, should be added to
  BetaTesterInvite = '15',
  BetaTesters = '16',
  BrandContacts = '7',
  DebitCardHolders = '17',
  DebitCardWaitlist = '9',
  EmployerProgramBeta = '18',
  GeneralUpdates = '3', // "General Updates" is going to be the master list that includes both
  GroupAdmins = '4', // Group admin mailing list
  GroupMembers = '5',
  InternalTestGroup = '13',
  MonthyNewsletters = '2', // "Monthly Newsletters" will be the non-users who sign up via the footer
  Q2Payout = '14',
}

export interface UserSubscriptions {
  userId: string;
  subscribe: Array<SubscriptionCode>;
  unsubscribe: Array<SubscriptionCode>;
}

export interface IContactsData {
  email: string;
  first_name?: string;
  last_name?: string;
  fields?: Array<{ id: number; value: string }>;
  phone?: string;
  tags?: Array<string>;
  subscribe?: ActiveCampaignListId[];
  unsubscribe?: ActiveCampaignListId[];
}

export interface IContactsImportData {
  contacts: Array<IContactsData>;
  callback?: ICallbackData; // lets you know when the import is complete
}

export type FieldIds = Array<{ name: string; id: number }>;

export type FieldValues = Array<{ id: number; value: string }>;

export type UpdateActiveCampaignDataRequest = {
  userId: Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptions?: {
    subscribe: SubscriptionCode[];
    unsubscribe: SubscriptionCode[];
  };
  tags?: {
    add: string[];
    remove: string[];
  };
  customFields?: FieldValues;
};

export interface ISubscriptionLists {
  subscribe: Array<{ listid: ActiveCampaignListId }>;
  unsubscribe: Array<{ listid: ActiveCampaignListId }>;
}
