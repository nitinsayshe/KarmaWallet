import { AccountBase, Item, Transaction } from 'plaid';

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
  institution: null | IPlaidInstitution;
  accounts: Array<AccountBase>;
  link_session_id: string;
}

export interface IPlaidItem {
  accounts: Array<AccountBase>;
  userId: string;
  link_session_id?: string;
  institution: null | IPlaidInstitution;
  transactions?: Array<Transaction>;
  total_transactions?: number;
  request_id?: string;
  item?: Item;
  access_token: string;
  item_id?: string;
  public_token?: string;
}
