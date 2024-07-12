export const PersonaInquiryStatusEnum = {
  Created: 'created',
  Pending: 'pending',
  Completed: 'completed',
  Expired: 'expired',
  Failed: 'failed',
  NeedsReview: 'needs_review',
  Approved: 'approved',
  Declined: 'declined',
} as const;
export type PersonaInquiryStatusEnumValues = (typeof PersonaInquiryStatusEnum)[keyof typeof PersonaInquiryStatusEnum];

export const PersonaCaseStatusEnum = {
  Open: 'Open',
  Pending: 'Pending',
  Approved: 'Approved',
  Declined: 'Declined',
} as const;
export type PersonaCaseStatusEnumValues = (typeof PersonaCaseStatusEnum)[keyof typeof PersonaCaseStatusEnum];

type TemplateData = {
  id: string;
  type: string;
};

export interface IPersonaCaseData {
  id: string;
  status: PersonaCaseStatusEnumValues;
  createdAt: string;
  attributes?: any;
}

export interface IPersonaInquiryData {
  id: string;
  status: PersonaInquiryStatusEnumValues;
  attributes?: any;
  templateId: string;
  createdAt: string;
}

export interface IPersonaIntegration {
  accountId: string;
  inquiries: IPersonaInquiryData[];
  cases: IPersonaCaseData[];
}

export interface IPersonaCreateAccountBody {
  data: {
    attributes: {
      refId?: string; // 'ref-id': 'KW internal user id or visitor id
      countryCode: string;
      socialSecurityNumber: string;
      nameFirst: string;
      nameLast: string;
      phoneNumber: string;
      birthdate: string; // 'YYYY-MM-DD'
      emailAddress: string;
      addressStreet1: string;
      addressStreet2?: string;
      addressCity: string;
      addressSubdivision: string;
      addressPostalCode: string;
    };
  };
}

export type PersonaGetInquiryResponse = {
  data: {
    type: string;
    id: string;
    attributes: {
      status: PersonaInquiryStatusEnumValues;
      referenceId: string | null;
      createdAt: string;
      completedAt: string | null;
      expiredAt: string | null;
    };
    relationships: {
      account: {
        data: TemplateData;
      };
      inquiryTemplate: {
        data: TemplateData;
      };
      sessions: {
        data: TemplateData[];
      };
    };
  };
  meta?: any;
};

export type PersonaGetCaseResponse = {
  data: {
    type: string;
    id: string;
    attributes: {
      status: PersonaCaseStatusEnumValues;
      referenceId: string | null;
      createdAt: string;
      completedAt: string | null;
      expiredAt: string | null;
    };
    relationships: {
      account: {
        data: TemplateData;
      };
      accounts: {
        data: TemplateData[];
      };
      inquiries: {
        data: TemplateData[];
      };
    };
  };
  meta?: any;
};

export const PersonaInquiryTemplateIdEnum = {
  // TODO: change this back to itmpl_AFqvVNPPTmMy752PwyeopspV8mSe
  DataCollection: 'itmpl_vgVhpStQRDohjxx9ZxvQ3eSCbsUD', // KW - 1 Data Collection
  KW5: 'itmpl_bbGdQaESkPsAfysa1mypvXtP7vcM',
} as const;
export type PersonaInquiryTemplateIdEnumValues = (typeof PersonaInquiryTemplateIdEnum)[keyof typeof PersonaInquiryTemplateIdEnum];

export const EventNamesEnum = {
  accountCreated: 'account.created', // Occurs whenever an account is created.
  accountRedacted: 'account.redacted', // Occurs whenever an account is redacted.
  accountArchived: 'account.archived', // Occurs whenever an account is archived.
  accountRestored: 'account.restored', // Occurs whenever an account is un-archived.
  accountConsolidated: 'account.consolidated', // Occurs when the account was combined with another account.
  accountTagAdded: 'account.tag-added', // Occurs when a tag was added to an account.
  accountTagRemoved: 'account.tag-removed', // Occurs when a tag was removed from an account.
  caseCreated: 'case.created', // Occurs when a case is created.
  caseAssigned: 'case.assigned', // Occurs when a case is assigned.
  caseResolved: 'case.resolved', // Occurs when a case is resolved.
  caseReopened: 'case.reopened', // Occurs when a case is reopened.
  caseStatusUpdated: 'case.status-updated', // Occurs when a case's status is updated
  caseUpdated: 'case.updated', // Occurs when a case is updated.
  documentCreated: 'document.created', // Occurs whenever a document is created.
  documentSubmitted: 'document.submitted', // Occurs whenever a document is submitted.
  documentProcessed: 'document.processed', // Occurs whenever a document is processed.
  documentErrored: 'document.errored', // Occurs whenever a document errors while processing.
  inquiryCreated: 'inquiry.created', // Occurs whenever an inquiry is created.
  inquiryStarted: 'inquiry.started', // Occurs whenever an inquiry is started. This happens the moment a verification is created or submitted on an inquiry.
  inquiryExpired: 'inquiry.expired', // Occurs when an inquiry expires. The default expiry is 24 hours.
  inquiryCompleted: 'inquiry.completed', // Occurs whenever an inquiry completes all the configured verifications.
  inquiryFailed: 'inquiry.failed', // Occurs whenever an inquiry exceeds the configured number of verifications.
  inquiryMarkedForReview: 'inquiry.marked-for-review', // Occurs when an inquiry was marked for review either through Workflows or the API.
  inquiryApproved: 'inquiry.approved', // Occurs whenever an inquiry is approved manually in the dashboard or automatically through Workflows or the API.
  inquiryDeclined: 'inquiry.declined', // Occurs when an inquiry is declined manually in the dashboard or automatically through Workflows or the API.
  inquiryTransitioned: 'inquiry.transitioned', // Occurs whenever a dynamic flow inquiry moves from one step in the inquiry flow to the next.
  inquirySessionStarted: 'inquiry-session.started', // Occurs whenever a user starts a session on an inquiry with a device. Multiple devices will each spawn a session.
  inquirySessionExpired: 'inquiry-session.expired', // Occurs when a session expires.
  inquirySessionCanceled: 'inquiry-session.canceled', // Occurs when a session is manually canceled by the user. Because sessions may be resumed, there may be multiple cancel events for a given session.
  reportAddressLookupReady: 'report/address-lookup.ready', // Occurs when an address lookup report has completed processing.
  reportAddressLookupErrored: 'report/address-lookup.errored', // Occurs when an address lookup report's processing has errored.
  reportAdverseMediaMatched: 'report/adverse-media.matched', // Occurs when an adverse media report has matched against at least one adverse media source as specified within the configuration.
  reportAdverseMediaReady: 'report/adverse-media.ready', // Occurs when an adverse media report has completed processing.
  reportAdverseMediaErrored: 'report/adverse-media.errored', // Occurs when an adverse media report's processing has errored.
  reportBusinessAdverseMediaMatched: 'report/business-adverse-media.matched', // Occurs when a business adverse media report has matched against at least one adverse media source as specified within configuration.
  reportBusinessAdverseMediaReady: 'report/business-adverse-media.ready', // Occurs when a business adverse media report has completed processing.
  reportBusinessAdverseMediaErrored: 'report/business-adverse-media.errored', // Occurs when a business adverse media report's processing has errored.
  reportBusinessWatchlistReady: 'report/business-watchlist.ready', // Occurs when a business watchlist report has completed processing.
  reportBusinessWatchlistMatched: 'report/business-watchlist.matched', // Occurs when a business watchlist report has matched against a watchlist as specified within the configuration.
  reportBusinessWatchlistErrored: 'report/business-watchlist.errored', // Occurs when a business watchlist report's processing has errored.
  reportEmailAddressReady: 'report/email-address.ready', // Occurs when an email address report has completed processing.
  reportEmailAddressErrored: 'report/email-address.errored', // Occurs when an email address report's processing has errored.
  reportPhoneNumberReady: 'report/phone-number.ready', // Occurs when a phone number report is ready.
  reportPhoneNumberErrored: 'report/phone-number.errored', // Occurs when a phone number report's processing has errored.
  reportProfileReady: 'report/profile.ready', // Occurs when a profile report is ready.
  reportProfileErrored: 'report/profile.errored', // Occurs when a profile report's processing has errored.
  reportPoliticallyExposedPersonMatched: 'report/politically-exposed-person.matched', // Occurs when a politically exposed person (PEP) report has matched against a watchlist as specified within the configuration.
  reportPoliticallyExposedPersonReady: 'report/politically-exposed-person.ready', // Occurs when a politically exposed person (PEP) report has completed processing.
  reportPoliticallyExposedPersonErrored: 'report/politically-exposed-person.errored', // Occurs when a politically exposed person (PEP) report's processing has errored.
  reportWatchlistMatched: 'report/watchlist.matched', // Occurs when a watchlist report has matched against a watchlist as specified within the configuration.
  reportWatchlistReady: 'report/watchlist.ready', // Occurs when a watchlist report has completed processing.
  reportWatchlistErrored: 'report/watchlist.errored', // Occurs when a watchlist report's processing has errored.
  selfieCreated: 'selfie.created', // Occurs whenever a selfie is created.
  selfieSubmitted: 'selfie.submitted', // Occurs whenever a selfie is submitted.
  selfieProcessed: 'selfie.processed', // Occurs whenever a selfie is processed.
  selfieErrored: 'selfie.errored', // Occurs whenever a selfie's processing has errored.
  transactionCreated: 'transaction.created', // Occurs whenever a transaction is created.
  transactionLabeled: 'transaction.labeled', // Occurs whenever a transaction is labeled.
  transactionRedacted: 'transaction.redacted', // Occurs whenever a transaction is redacted.
  transactionStatusUpdated: 'transaction.status-updated', // Occurs whenever a transaction's status is updated.
  verificationCreated: 'verification.created', // Occurs whenever a verification is created.
  verificationSubmitted: 'verification.submitted', // Occurs when a verification is submitted.
  verificationPassed: 'verification.passed', // Occurs when a verification passes.
  verificationFailed: 'verification.failed', // Occurs when a verification fails.
  verificationRequiresRetry: 'verification.requires-retry', // Occurs when a verification requires the individual to retry.
  verificationCanceled: 'verification.canceled', // Occurs when a verification gets cancelled.
} as const;

export type EventNamesEnumValues = (typeof EventNamesEnum)[keyof typeof EventNamesEnum];

export interface IPersonaAccountsRequest {
  size?: string;
  before?: string;
  after?: string;
}

type VerificationData = {
  id: string;
  type: string;
};

type InquiryRelationships = {
  accounts?: { data: TemplateData[] };
  account?: { data: TemplateData };
  reports: { data: any[] };
  template: { data: TemplateData };
  inquiries: { data: TemplateData[] };
  sessions: { data: any[] };
  verifications: { data: VerificationData[] };
  inquiryTemplate?: { data: TemplateData };
};

type InquiryAttributes = {
  status: PersonaInquiryStatusEnumValues | PersonaCaseStatusEnumValues;
  referenceId: string | null;
  createdAt: string;
  completedAt: string | null;
  expiredAt: string | null;
  nameFirst?: string | null;
  nameMiddle?: string | null;
  nameLast?: string | null;
  birthdate?: string | null;
  addressStreet1?: string | null;
  addressStreet2?: string | null;
  addressCity?: string | null;
  addressSubdivision?: string | null;
  addressSubdivisionAbbr?: string | null;
  addressPostalCode?: string | null;
  addressPostalCodeAbbr?: string | null;
  socialSecurityNumber?: string | null;
  identificationNumber?: string | null;
  emailAddress: string | null;
  phoneNumber: string | null;
  fields: any; // depends on the type
};

type InquiryData = {
  type: string;
  id: string;
  attributes: InquiryAttributes;
  relationships: InquiryRelationships;
};

type IncludedData = {
  type: string;
  id: string;
  attributes: any; // depends on the type
  fields: any; // depends on the type
};

type PayloadData = {
  data: InquiryData;
  included: IncludedData[];
};

type EventAttributes = {
  name: EventNamesEnumValues;
  payload: PayloadData;
  createdAt: string;
};

type EventData = {
  type: string;
  id: string;
  attributes: EventAttributes;
};

export type PersonaWebhookBody = {
  data: EventData;
};

export type PersonaAccountData = {
  accountId: string;
};

export const RelationshipPathsEnum = {
  account: 'account',
  sessions: 'sessions',
  inquiryTemplate: 'inquiryTemplate',
} as const;
export type RelationshipPathsEnumValues = (typeof RelationshipPathsEnum)[keyof typeof RelationshipPathsEnum];
