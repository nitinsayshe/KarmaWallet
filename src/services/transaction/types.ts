import { AqpQuery } from 'api-query-params';
import { ObjectId } from 'mongoose';
import { TransactionIntegrationTypesEnumValues } from '../../lib/constants';
import { CompanyRating } from '../../lib/constants/company';
import { ICompanyProtocol } from '../company';
import { TransactionCreditSubtypeEnumValues } from '../../lib/constants/transaction';

export enum ITransactionsConfig {
  MostRecent = 'recent',
}

export interface ITransactionIdParam {
  transactionId: string;
}

export interface IGetRecentTransactionsRequestQuery {
  limit?: number;
  unique?: boolean;
  userId?: string | ObjectId;
  integrationType: TransactionIntegrationTypesEnumValues;
}

export interface IGetTransactionsRequestQuery {}

export interface ITransactionsRequestQuery extends AqpQuery {
  userId?: string;
  includeOffsets?: boolean;
  includeNullCompanies?: boolean;
  onlyOffsets?: boolean;
  integrationType?: TransactionIntegrationTypesEnumValues;
  startDate: Date;
  endDate: Date;
}

export interface ITransactionsAggregationRequestQuery {
  userId?: string;
  ratings?: CompanyRating[];
  page?: number;
  limit?: number;
}

export interface ITransactionOptions {
  includeOffsets?: boolean;
  includeNullCompanies?: boolean;
}

export type EnrichTransactionResponse = {
  company: ICompanyProtocol;
  carbonEmissionKilograms: number; // emmissions associated with the transaction
  karmaScore: number; // 0 to 100
}

export type EnrichTransactionRequest = {
  companyName: string;
  alternateCompanyName?: string;
  amount: number; // in USD
}

export interface IGetFalsePositivesQuery {
  page: number;
  limit: number;
  matchType: string;
  originalValue: string;
  company: string;
  search: string;
}

export interface ICreateFalsePositiveRequest {
  matchType: string;
  originalValue: string;
}

export interface IUpdateFalsePositiveRequest {
  matchType?: string;
  originalValue?: string;
}

export interface IFalsePositiveIdParam {
  id: string;
}

export interface IGetManualMatchesQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ICreateManualMatchRequest {
  matchType: string;
  company: string;
  originalValue: string;
}

export interface IManualMatchIdParam {
  id: string;
}

export interface IUpdateManualMatchRequest {
  matchType?: string;
  company?: string;
  originalValue?: string;
  integrationType?: TransactionIntegrationTypesEnumValues;
}

export interface IGetMatchedCompaniesQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface IGPADeposit {
  amount: number;
  userId: string;
}

export interface IInitiateGPADepositsRequest {
  groupId?: string;
  type: TransactionCreditSubtypeEnumValues;
  gpaDeposits: IGPADeposit[];
  memo?: string;
}

export interface IMarqetaGPACustomTags {
  groupId?: string;
  type: TransactionCreditSubtypeEnumValues;
}
