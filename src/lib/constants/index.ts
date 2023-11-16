export interface ICustomErrorBody {
  name: string;
  code: number;
}

export enum ApiKeyStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export const IMapMarqetaCard = {
  name: 'Karma Wallet Prepaid Reloadable Card',
  type: 'depository',
  subtype: 'reloadable',
  status: 'linked',
  institution: 'Karma Wallet',
  initialTransactionsProcessing: false,
  isEnrolledInAutomaticRewards: true,
};

export interface IErrorType {
  AUTHENTICATION: ICustomErrorBody;
  CONFLICT: ICustomErrorBody;
  GEN: ICustomErrorBody;
  FORBIDDEN: ICustomErrorBody;
  INVALID_ARG: ICustomErrorBody;
  NOT_ALLOWED: ICustomErrorBody;
  NOT_FOUND: ICustomErrorBody;
  SERVER: ICustomErrorBody;
  SERVICE: ICustomErrorBody;
  TOKEN: ICustomErrorBody;
  UNAUTHORIZED: ICustomErrorBody;
  UNPROCESSABLE: ICustomErrorBody;
  TOO_MANY_REQUESTS: ICustomErrorBody;
}

export enum UserRoles {
  None = 'none',
  Member = 'member',
  Admin = 'admin',
  SuperAdmin = 'superadmin',
}

export enum UserGroupRole {
  Member = 'member',
  Admin = 'admin',
  SuperAdmin = 'superadmin',
  Owner = 'owner',
}

export enum SocketNamespaces {
  Karma = 'karma',
  Main = 'main',
}

export enum TokenTypes {
  Email = 'email',
  Password = 'password',
}

export enum EmailAddresses {
  NoReply = 'no-reply@karmawallet.io',
  ReplyTo = 'support@karmawallet.io',
}

export enum CardStatus {
  Linked = 'linked',
  Unlinked = 'unlinked',
  Error = 'error',
  Removed = 'removed',
}

export enum KardEnrollmentStatus {
  Enrolled = 'enrolled',
  Unenrolled = 'unenrolled',
}

export enum CardNetwork {
  Visa = 'VISA',
  Mastercard = 'MASTERCARD',
  Amex = 'AMERICAN EXPRESS',
  Discover = 'DISCOVER',
}

export enum UnsdgNames {
  People = 'People',
  Planet = 'Planet',
}

export enum BankConnectionStatus {
  Linked = 'linked',
  Unlinked = 'unlinked',
  Error = 'error',
  Removed = 'removed',
}

export const ErrorTypes = {
  AUTHENTICATION: { name: 'Authentication', code: 401 },
  CONFLICT: { name: 'Conflict', code: 409 },
  GEN: { name: 'Error', code: 400 },
  FORBIDDEN: { name: 'Forbidden', code: 403 }, // user is known, but lacks the necessary permissions
  INVALID_ARG: { name: 'InvalidArgument', code: 422 },
  NOT_ALLOWED: { name: 'NotAllowed', code: 405 },
  NOT_FOUND: { name: 'NotFound', code: 404 },
  SERVER: { name: 'ServerError', code: 500 },
  SERVICE: { name: 'ServiceError', code: 422 },
  TOKEN: { name: 'JsonWebTokenError', code: 400 },
  UNAUTHORIZED: { name: 'Unauthorized', code: 401 }, // invalid credentials have been provided
  UNPROCESSABLE: { name: 'UnprocessableEntity', code: 422 },
  TOO_MANY_REQUESTS: { name: 'TooManyRequests', code: 429 },
};

export const AUTHKEY_HEADER = 'authKey';
export const TOKEN_REMOVE = 'remove_me';
export const DEVICE_IDENTIFIER = 'identifierKey';

// used for V2 api calls
export const SERVICE_NAME_HEADER = 'serviceName';
export const API_V2_SERVICE_NAME = 'apiV2';

export enum SocketEvents {
  Update = 'update',
}

export const AllowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3001',
  'http://localhost:5000',
  'https://localhost:5000',
  'https://www.karmawallet.io',
  'http://www.karmawallet.io',
  'http://karmawallet.io',
  'https://karmawallet.io',
  'http://ui.sandbox-1.karmawallet.io',
  'https://ui.sandbox-1.karmawallet.io',
  'http://ui.sandbox-2.karmawallet.io',
  'https://ui.sandbox-2.karmawallet.io',
  'http://ui.sandbox-3.karmawallet.io',
  'https://ui.sandbox-3.karmawallet.io',
  'http://ui.staging.karmawallet.io',
  'https://ui.staging.karmawallet.io',
  'http://developer.karmawallet.io',
  'https://developer.karmawallet.io',
  'http://developer.staging.karmawallet.io',
  'https://developer.staging.karmawallet.io',
  'http://developer.sandbox-1.karmawallet.io',
  'https://developer.sandbox-1.karmawallet.io',
  'http://admin.karmawallet.io',
  'https://admin.karmawallet.io',
  'http://admin.staging.karmawallet.io',
  'https://admin.staging.karmawallet.io',
  'http://admin.sandbox-1.karmawallet.io',
  'https://admin.sandbox-1.karmawallet.io',
  'http://group.karmawallet.io',
  'https://group.karmawallet.io',
  'http://group.staging.karmawallet.io',
  'https://group.staging.karmawallet.io',
  'http://group.sandbox-1.karmawallet.io',
  'https://group.sandbox-1.karmawallet.io',
  'https://frontend.staging.karmawallet.io',
  'http://frontend.staging.karmawallet.io',
  'https://frontend.karmawallet.io',
  'http://frontend.karmawallet.io',
  'https://sandbox.karmawallet.io',
  'http://sandbox.karmawallet.io',
  'https://cu.sandbox.karmawallet.io',
  'http://cu.sandbox.karmawallet.io',
  'https://dev.cu.sandbox.karmawallet.io',
  'http://dev.cu.sandbox.karmawallet.io',
  'https://frontend.demo.karmawallet.io',
  'http://frontend.demo.karmawallet.io',
  'https://sandbox2.karmawallet.io',
  'http://sandbox2.karmawallet.io',
];

export const emailVerificationDays = 10;
export const authTokenDays = 30;
export const passwordResetTokenMinutes = 15;

export const RareTransactionQuery: {
  'integrations.rare': { $ne: any };
} = {
  'integrations.rare': { $ne: null },
};

export const KarmaWalletCdnUrl = 'cdn.karmawallet.io';

export const sectorsToExclude = [
  '62192ef2f022c9e3fbff0b66', // staging Manufacturing
  '621b9adb5f87e75f53666ff2', // prod Manufacturing
  '62192ef2f022c9e3fbff0b06', // staging Educational Services
  '621b9ada5f87e75f53666f92', // prod Eductional Services
  '62192ef3f022c9e3fbff0ba2', // staging Nonprofits
  '621b9adb5f87e75f5366702e', // prod Nonprofits
];

export const CommissionPayoutMonths = [0, 3, 6, 9];

export const CommissionPayoutDayForUser = 15;

export enum CollectionNames {
  Card = 'cards',
  CommissionPayout = 'commission_payouts',
  CommissionPayoutOverview = 'commission_payout_overviews',
  Commission = 'commissions',
  Company = 'companies',
  CompanyDataSource = 'company_data_sources',
  CompanyUnsdg = 'company_unsdgs',
  DataSourceMapping = 'data_source_mappings',
  DataSource = 'data_sources',
  Group = 'groups',
  MatchedCompanyName = 'matched_company_names',
  MerchantRate = 'merchant_rates',
  Merchant = 'merchants',
  Misc = 'miscs',
  PlaidCategoriesToSectorMapping = 'plaid_categories_to_sector_mappings',
  PlaidCategoryMapping = 'plaid_category_mappings',
  Sector = 'sectors',
  Statement = 'statements',
  Transaction = 'transactions',
  UnmatchedCompanyName = 'unmatched_company_names',
  UnsdgCategory = 'unsdg_categories',
  UnsdgSubcategory = 'unsdg_subcategories',
  UnsdgTarget = 'unsdg_targets',
  Unsdg = 'unsdgs',
  UserGroup = 'user_groups',
  UserImpactTotal = 'user_impact_totals',
  UserLog = 'user_logs',
  UserMontlyImpactReport = 'user_monthly_impact_reports',
  User = 'users',
  ValueCompanyMapping = 'value_company_mappings',
  ValueDataSourceMapping = 'value_data_source_mappings',
  Value = 'values',
}

export const MaxPaginationLimit = 200;
export const DefaultPaginationLimit = 10;
export const DefaultPaginationPage = 1;

export const HubspotPortalId = '22346640';

export const KwApiKeyHeader = 'X-KW-API-KEY';
export const KwApiIdHeader = 'X-KW-API-ID';

export const ImpactKarmaCompanyData = {
  merchantId: '63d2b2d148234101740ccdd0',
  companyId: '62def0e77b212526d1e055ca',
};

/* These nubers were taken from the explanation here: https://stackoverflow.com/questions/45929493/node-js-maximum-safe-floating-point-number */
export const MaxSafeSinglePercisionFloatingPointNumber = (Number.MAX_SAFE_INTEGER + 1) / 16 - 1;
export const MaxSafeDoublePercisionFloatingPointNumber = (Number.MAX_SAFE_INTEGER + 1) / 128 - 1;

export const MaxCompanyNameLength = 250;
export const MinCompanyNameLength = 1;

export const MinCompanayKarmaScore = -16;
export const MaxCompanayKarmaScore = 16;

export const UserCommissionPercentage = 0.75;

export enum FrontendTemplates {
  OpenGraph = 'openGraph',
  Title = 'title',
}

export enum OpenGraphTypes {
  Article = 'article',
}

export const enum StateAbbreviation {
  'AL',
  'AK',
  'AS',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'DC',
  'FM',
  'FL',
  'GA',
  'GU',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MH',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'MP',
  'OH',
  'OK',
  'OR',
  'PW',
  'PA',
  'PR',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VI',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
}

export const CentsInUSD = 100;

export const TransactionIntegrationTypesEnum = {
  Plaid: 'plaid',
  Marqeta: 'marqeta',
  Rare: 'rare',
  Kard: 'kard',
} as const;
export type TransactionIntegrationTypesEnumValues = (typeof TransactionIntegrationTypesEnum)[keyof typeof TransactionIntegrationTypesEnum];

export const ChargebackTypeEnum = {
  INITIATED: 'initiated',
  REPRESENTMENT: 'representment',
  PREARBITRATION: 'prearbitration',
  PREARBITRATION_RESPONDED: 'prearbitration.responded',
  ARBITRATION: 'arbitration',
  CASE_WON: 'case.won',
  CASE_LOST: 'case.lost',
  NETWORK_REJECTED: 'network.rejected',
  WRITTEN_OFF_ISSUER: 'written.off.issuer',
  WRITTEN_OFF_PROGRAM: 'written.off.program',
} as const;
export type ChargebackTypeEnumValues = (typeof ChargebackTypeEnum)[keyof typeof ChargebackTypeEnum];
