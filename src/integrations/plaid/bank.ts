import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  AccountBase,
} from 'plaid';
import { Schema } from 'mongoose';
import { IPlaidBankItem, IPlaidInstitution } from './types';
import { BankConnectionModel, IBankConnectionDocument } from '../../models/bankConnection';

dayjs.extend(utc);

class Bank {
  // owner of the bank
  _userId: Schema.Types.ObjectId = null;
  // the bank object stored in the db. not available until after save
  _bank: IBankConnectionDocument = null;
  // all plaid items this plaid account was found in (in case we ever need to reference them later)
  _plaid_items: Set<string> = null;
  // the plaid account object
  _account: AccountBase = null;
  _accessToken: string = null;
  _publicToken: string = null;
  _linkSessionId: string = null;
  _institution: IPlaidInstitution = null;
  _status: string = null;
  _fundingSourceToken: string = null;
  _isNew = false;

  constructor(userId: Schema.Types.ObjectId, account: AccountBase, plaidItem: IPlaidBankItem) {
    this._userId = userId;
    this._plaid_items = new Set([`${plaidItem.item_id}`]); // use Set to prevent duplicates
    this._account = account;
    this._accessToken = plaidItem.access_token as string;
    this._publicToken = plaidItem.public_token as string;
    this._linkSessionId = plaidItem.link_session_id as string;
    this._institution = plaidItem.institution as IPlaidInstitution;
    this._status = plaidItem.status as string;
    this._fundingSourceToken = plaidItem.fundingSourceToken as string;
  }

  get _id() { return this._bank?._id || null; }
  get accountId() { return this._account.account_id; }
  get isNew() { return this._isNew; }
  get isValid() {
    return !!this._userId
      && !!this._bank
      && this._plaid_items.size > 0
      && !!this._account;
  }

  /**
   * @returns the object structure to be saved in the karma db
   */
  toKarmaFormat = () => ({
    userId: this._userId,
    name: this._account?.name,
    mask: this._account.mask,
    type: this._account.type,
    subtype: this._account.subtype,
    institution: this._institution.name,
    fundingSourceToken: this._fundingSourceToken,
    integrations: {
      plaid: {
        accessToken: this._accessToken,
        accountId: `${this._account.account_id}`,
        items: Array.from(this._plaid_items),
        publicToken: this._publicToken,
        linkSessionId: this._linkSessionId,
        institutionId: this._institution?.institution_id,
      },
    },
  });

  save = async () => {
    // returned from Plaid could change.
    let bank = await BankConnectionModel.findOne({
      userId: this._userId,
      name: this._account?.name,
      mask: this._account.mask,
      type: this._account.type,
      subtype: this._account.subtype,
      institution: this._institution?.institution_id,
      'integrations.plaid.accountId': this._account.account_id,
    });

    if (!!bank) {
      Object.entries(this.toKarmaFormat()).forEach(([key, value]) => {
        // force casting here to avoid no string as index error
        (bank as any)[key] = value;
      });
      bank.lastModified = dayjs().utc().toDate();
    } else {
      bank = new BankConnectionModel({
        ...this.toKarmaFormat(),
        createdOn: dayjs().utc().format(),
      });
      this._isNew = true;
    }

    this._bank = await bank.save();
  };

  /**
   * updates this instances plaid account by trackign the new
   * plaid item id in the list of all plaid items and replacing
   * the existing account object
   *
   * @param {Object} account - the plaid account object to update this instance with
   */
  update = (account: AccountBase, plaidItem: IPlaidBankItem) => {
    this._plaid_items.add(`${plaidItem.item_id}`);
    this._account = account;
    this._accessToken = `${plaidItem.access_token}`;
    // TODO: determine if need to update or ignore new account...
    // - is there some date that can be used to verify?
    // - could use the lastUpdated property on the plaid item?
  };
}

export default Bank;
