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
  Locked = 'locked',
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

export const StateAbbreviationEnum = {
  AL: 'AL',
  AK: 'AK',
  AS: 'AS',
  AZ: 'AZ',
  AR: 'AR',
  CA: 'CA',
  CO: 'CO',
  CT: 'CT',
  DE: 'DE',
  DC: 'DC',
  FM: 'FM',
  FL: 'FL',
  GA: 'GA',
  GU: 'GU',
  HI: 'HI',
  ID: 'ID',
  IL: 'IL',
  IN: 'IN',
  IA: 'IA',
  KS: 'KS',
  KY: 'KY',
  LA: 'LA',
  ME: 'ME',
  MH: 'MH',
  MD: 'MD',
  MA: 'MA',
  MI: 'MI',
  MN: 'MN',
  MS: 'MS',
  MO: 'MO',
  MT: 'MT',
  NE: 'NE',
  NV: 'NV',
  NH: 'NH',
  NJ: 'NJ',
  NM: 'NM',
  NY: 'NY',
  NC: 'NC',
  ND: 'ND',
  MP: 'MP',
  OH: 'OH',
  OK: 'OK',
  OR: 'OR',
  PW: 'PW',
  PA: 'PA',
  PR: 'PR',
  RI: 'RI',
  SC: 'SC',
  SD: 'SD',
  TN: 'TN',
  TX: 'TX',
  UT: 'UT',
  VT: 'VT',
  VI: 'VI',
  VA: 'VA',
  WA: 'WA',
  WV: 'WV',
  WI: 'WI',
  WY: 'WY',
} as const;
export type StateAbbreviationEnumValues = (typeof StateAbbreviationEnum)[keyof typeof StateAbbreviationEnum];

export const ZipCodeRangesForStates = [
  { zipStart: 35000, zipEnd: 36999, code: StateAbbreviationEnum.AL, long: 'Alabama' },
  { zipStart: 99500, zipEnd: 99999, code: StateAbbreviationEnum.AK, long: 'Alaska' },
  { zipStart: 85000, zipEnd: 86999, code: StateAbbreviationEnum.AZ, long: 'Arizona' },
  { zipStart: 71600, zipEnd: 72999, code: StateAbbreviationEnum.AR, long: 'Arkansas' },
  { zipStart: 90000, zipEnd: 96699, code: StateAbbreviationEnum.CA, long: 'California' },
  { zipStart: 80000, zipEnd: 81999, code: StateAbbreviationEnum.CO, long: 'Colorado' },
  { zipStart: 6000, zipEnd: 6999, code: StateAbbreviationEnum.CT, long: 'Connecticut' },
  { zipStart: 19700, zipEnd: 19999, code: StateAbbreviationEnum.DE, long: 'Delaware' },
  { zipStart: 32000, zipEnd: 34999, code: StateAbbreviationEnum.FL, long: 'Florida' },
  { zipStart: 30000, zipEnd: 31999, code: StateAbbreviationEnum.GA, long: 'Georgia' },
  { zipStart: 96700, zipEnd: 96999, code: StateAbbreviationEnum.HI, long: 'Hawaii' },
  { zipStart: 83200, zipEnd: 83999, code: StateAbbreviationEnum.ID, long: 'Idaho' },
  { zipStart: 60000, zipEnd: 62999, code: StateAbbreviationEnum.IL, long: 'Illinois' },
  { zipStart: 46000, zipEnd: 47999, code: StateAbbreviationEnum.IN, long: 'Indiana' },
  { zipStart: 50000, zipEnd: 52999, code: StateAbbreviationEnum.IA, long: 'Iowa' },
  { zipStart: 66000, zipEnd: 67999, code: StateAbbreviationEnum.KS, long: 'Kansas' },
  { zipStart: 40000, zipEnd: 42999, code: StateAbbreviationEnum.KY, long: 'Kentucky' },
  { zipStart: 70000, zipEnd: 71599, code: StateAbbreviationEnum.LA, long: 'Louisiana' },
  { zipStart: 3900, zipEnd: 4999, code: StateAbbreviationEnum.ME, long: 'Maine' },
  { zipStart: 20600, zipEnd: 21999, code: StateAbbreviationEnum.MD, long: 'Maryland' },
  { zipStart: 1000, zipEnd: 2799, code: StateAbbreviationEnum.MA, long: 'Massachusetts' },
  { zipStart: 48000, zipEnd: 49999, code: StateAbbreviationEnum.MI, long: 'Michigan' },
  { zipStart: 55000, zipEnd: 56999, code: StateAbbreviationEnum.MN, long: 'Minnesota' },
  { zipStart: 38600, zipEnd: 39999, code: StateAbbreviationEnum.MS, long: 'Mississippi' },
  { zipStart: 63000, zipEnd: 65999, code: StateAbbreviationEnum.MO, long: 'Missouri' },
  { zipStart: 59000, zipEnd: 59999, code: StateAbbreviationEnum.MT, long: 'Montana' },
  { zipStart: 27000, zipEnd: 28999, code: StateAbbreviationEnum.NC, long: 'North Carolina' },
  { zipStart: 58000, zipEnd: 58999, code: StateAbbreviationEnum.ND, long: 'North Dakota' },
  { zipStart: 68000, zipEnd: 69999, code: StateAbbreviationEnum.NE, long: 'Nebraska' },
  { zipStart: 88900, zipEnd: 89999, code: StateAbbreviationEnum.NV, long: 'Nevada' },
  { zipStart: 3000, zipEnd: 3899, code: StateAbbreviationEnum.NH, long: 'New Hampshire' },
  { zipStart: 7000, zipEnd: 8999, code: StateAbbreviationEnum.NJ, long: 'New Jersey' },
  { zipStart: 87000, zipEnd: 88499, code: StateAbbreviationEnum.NM, long: 'New Mexico' },
  { zipStart: 10000, zipEnd: 14999, code: StateAbbreviationEnum.NY, long: 'New York' },
  { zipStart: 43000, zipEnd: 45999, code: StateAbbreviationEnum.OH, long: 'Ohio' },
  { zipStart: 73000, zipEnd: 74999, code: StateAbbreviationEnum.OK, long: 'Oklahoma' },
  { zipStart: 97000, zipEnd: 97999, code: StateAbbreviationEnum.OR, long: 'Oregon' },
  { zipStart: 15000, zipEnd: 19699, code: StateAbbreviationEnum.PA, long: 'Pennsylvania' },
  { zipStart: 300, zipEnd: 999, code: StateAbbreviationEnum.PR, long: 'Puerto Rico' },
  { zipStart: 2800, zipEnd: 2999, code: StateAbbreviationEnum.RI, long: 'Rhode Island' },
  { zipStart: 29000, zipEnd: 29999, code: StateAbbreviationEnum.SC, long: 'South Carolina' },
  { zipStart: 57000, zipEnd: 57999, code: StateAbbreviationEnum.SD, long: 'South Dakota' },
  { zipStart: 37000, zipEnd: 38599, code: StateAbbreviationEnum.TN, long: 'Tennessee' },
  { zipStart: 75000, zipEnd: 79999, code: StateAbbreviationEnum.TX, long: 'Texas' },
  { zipStart: 88500, zipEnd: 88599, code: StateAbbreviationEnum.TX, long: 'Texas' },
  { zipStart: 84000, zipEnd: 84999, code: StateAbbreviationEnum.UT, long: 'Utah' },
  { zipStart: 5000, zipEnd: 5999, code: StateAbbreviationEnum.VT, long: 'Vermont' },
  { zipStart: 22000, zipEnd: 24699, code: StateAbbreviationEnum.VA, long: 'Virginia' },
  { zipStart: 20000, zipEnd: 20599, code: StateAbbreviationEnum.DC, long: 'Washington DC' },
  { zipStart: 98000, zipEnd: 99499, code: StateAbbreviationEnum.WA, long: 'Washington' },
  { zipStart: 24700, zipEnd: 26999, code: StateAbbreviationEnum.WV, long: 'West Virginia' },
  { zipStart: 53000, zipEnd: 54999, code: StateAbbreviationEnum.WI, long: 'Wisconsin' },
  { zipStart: 82000, zipEnd: 83199, code: StateAbbreviationEnum.WY, long: 'Wyoming' },
] as const;
export const CentsInUSD = 100;

export const TransactionIntegrationTypesEnum = {
  Plaid: 'plaid',
  Marqeta: 'marqeta',
  Rare: 'rare',
  Kard: 'kard',
} as const;
export type TransactionIntegrationTypesEnumValues = (typeof TransactionIntegrationTypesEnum)[keyof typeof TransactionIntegrationTypesEnum];

export const ChargebackTypeEnum = {
  ARBITRATION: 'arbitration',
  CASE_LOST: 'case.lost',
  REGULATION_CASE_LOST: 'regulation.case.lost',
  REGULATION_CASE_LOST_ACTION_REQUIRED: 'regulation.case.lost.action.required',
  CASE_LOST_ACTION_REQUIRED: 'case.lost.action.required',
  CASE_WON: 'case.won',
  REGULATION_CASE_WON: 'regulation.case.won',
  INITIATED: 'initiated',
  REGULATION_INITIATED: 'regulation.initiated',
  NETWORK_REJECTED: 'network.rejected',
  PREARBITRATION: 'prearbitration',
  PREARBITRATION_RESPONDED: 'prearbitration.responded',
  REGULATION_PROVISIONAL_CREDIT_PERMANENT: 'regulation.provisional.credit.permanent',
  PROVISIONAL_CREDIT_PERMANENT: 'provisional.credit.permanent',
  REPRESENTMENT: 'representment',
  WRITTEN_OFF_ISSUER: 'written.off.issuer',
  WRITTEN_OFF_PROGRAM: 'written.off.program',
} as const;
export type ChargebackTypeEnumValues = (typeof ChargebackTypeEnum)[keyof typeof ChargebackTypeEnum];

export const GroupTagsEnum = {
  EmployerBeta: 'employer-beta',
} as const;
export type GroupTagsEnumValues = typeof GroupTagsEnum[keyof typeof GroupTagsEnum];

export const AppVersionEnum = {
  Beta: 'beta',
  V1: 'v1',
} as const;

export const MiscAppVersionKey = 'AppVersion';

export const HttpsPort = '443';
export const HttpPort = '80';

export const DateKarmaMembershipStoppedbBeingFree = '2024-03-18';

export const AutomatedFuelDispensersMccCode = '5542';
export const RestaurantMccCode = '5812';
export const FastFoodMccCode = '5814';
