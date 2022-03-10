export interface ICustomErrorBody {
  name: string;
  code: number;
}

export interface IErrorType {
  AUTHENTICATION: ICustomErrorBody
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
  AltEmail = 'altEmail'
}

export enum EmailAddresses {
  NoReply = 'no-reply@karmawallet.io',
  ReplyTo = 'support@karmawallet.io',
}

export enum JobStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum CardStatus {
  Linked = 'linked',
  Unlinked = 'unlinked',
  Error = 'error',
}

export enum UnsdgNames {
  People = 'People',
  Planet = 'Planet',
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

// used for V2 api calls
export const SERVICE_NAME_HEADER = 'serviceName';
export const API_V2_SERVICE_NAME = 'apiV2';

export enum SocketEvents {
  Update = 'update',
}

export const AllowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
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
  'http://admin.karmawallet.io',
  'https://admin.karmawallet.io',
  'http://admin.staging.karmawallet.io',
  'https://admin.staging.karmawallet.io',
];

export const emailVerificationDays = 10;
export const authTokenDays = 30;
export const passwordResetTokenMinutes = 15;

export const RareTransactionQuery: {
  'integrations.rare': { $ne: any }
} = {
  'integrations.rare': { $ne: null },
};
