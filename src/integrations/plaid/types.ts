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
