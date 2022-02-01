import {
  Schema,
  model,
  Document,
  Model,
} from 'mongoose';
import { IModel } from '../types/model';

export interface IIntegrationMappingSummary {
  source: string;
  totalCards: number;
  totalAccessTokens: number;
  totalTransactions: number;
  existingCompanyMatches: number;
  newMatchedToCompany: number;
  unmatchedToCompany: number;
  newTransactions: number;
  updatedTransactions: number;
  startTimestamp: Date;
  endTimestamp: Date;
}

export interface IIntegrationMappingSummaryDocument extends IIntegrationMappingSummary, Document {}
export type IIntegrationMappingSummaryModel = IModel<IIntegrationMappingSummary>;

const integrationMappingSummarySchema = new Schema({
  source: { type: String }, // what integration is this summary for
  totalCards: { type: Number }, // total number of that were linked at the start of this job
  totalAccessTokens: { type: Number }, // the total number of access tokens used to pull transactions
  totalTransactions: { type: Number }, // the total number of transactions pulled
  existingCompanyMatches: { type: Number }, // transactions that were mapped to companies based on preexisting company matches we have stored in db
  newMatchedToCompany: { type: Number }, // transactions that were mapped to a company in our db, but werent caught in out existing matches
  unmatchedToCompany: { type: Number }, // transactions from companies we did not have in our db
  newTransactions: { type: Number }, // new transactions found since the last time transactions were pulled
  updatedTransactions: { type: Number }, // transactions we already had that were unpdated
  startTimestamp: { type: Date }, // when this job started
  endTimestamp: { type: Date }, // when this job ended
});

export const IntegrationMappingSummaryModel = model<IIntegrationMappingSummaryDocument, Model<IIntegrationMappingSummary>>('integration_mapping_summary', integrationMappingSummarySchema);
