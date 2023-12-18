import { AccountBase, AccountIdentity, Item, Transaction } from 'plaid';
import { ObjectId } from 'mongoose';
import { PlaidCompanyMatchType } from '../../lib/constants/plaid';
import { CombinedPartialTransaction } from '../../types/transaction';

export interface IPlaidInstitution {
  name: string;
  institution_id: string;
}

export interface IPlaidAccount {
  id: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  verification_status: string;
}

export interface IPlaidLinkOnSuccessMetadata {
  institution?: IPlaidInstitution;
  accounts: AccountBase[];
  link_session_id: string;
}

export interface IPlaidItem {
  accounts: AccountBase[];
  userId: string;
  link_session_id?: string;
  institution?: IPlaidInstitution;
  transactions?: Transaction[];
  total_transactions?: number;
  request_id?: string;
  item?: Item;
  access_token: string;
  item_id?: string;
  public_token?: string;
}

export interface IPlaidBankItem {
  accounts: AccountIdentity[];
  userId: string;
  link_session_id?: string;
  institution?: IPlaidInstitution;
  transactions?: Transaction[];
  fundingSourceToken?: string;
  total_transactions?: number;
  request_id?: string;
  item?: Item;
  access_token: string;
  item_id?: string;
  public_token?: string;
  status: string;
}

export interface ICompanyMatchingResult {
  value: string;
  matchType: PlaidCompanyMatchType;
  originalValue: string;
  company: ObjectId;
}

export interface IMatchedTransaction extends CombinedPartialTransaction {
  company?: ObjectId;
}
