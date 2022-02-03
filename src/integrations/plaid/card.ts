import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  AccountBase, Institution, Transaction as PlaidTransaction, TransactionsGetResponse,
} from 'plaid';
import { Schema } from 'mongoose';
import Transaction from './transaction';
import { CardModel, ICardDocument } from '../../models/card';
import { CardStatus } from '../../lib/constants';

dayjs.extend(utc);

class Card {
  // owner of the card
  _userId: Schema.Types.ObjectId = null;
  // the card object stored in the db. not available until after save
  _card: ICardDocument = null;
  // all plaid items this plaid account was found in (in case we ever need to reference them later)
  _plaid_items: Set<string> = null;
  // the plaid account object
  _account: AccountBase = null;
  _accessToken: string = null;
  _publicToken: string = null;
  _linkSessionId: string = null;
  _institution: Institution = null;
  _transactionsIndex = new Set();
  // all transactions for this card
  _transactions: Transaction[] = [];
  _duplicateTransactions: Transaction[] = [];
  _isNew = false;
  constructor(userId: Schema.Types.ObjectId, account: AccountBase, plaidItem: TransactionsGetResponse) {
    this._userId = userId;
    this._plaid_items = new Set([`${plaidItem.item_id}`]); // use Set to prevent duplicates
    this._account = account;
    this._accessToken = plaidItem.access_token;
    this._publicToken = plaidItem.public_token;
    this._linkSessionId = plaidItem.link_session_id;
    this._institution = plaidItem.institution;
  }

  get _id() { return this._card?._id || null; }
  get accountId() { return this._account.id; }
  get isNew() { return this._isNew; }
  get isValid() {
    return !!this._userId
      && !!this._card
      && this._plaid_items.size > 0
      && !!this._account;
  }
  get transactions() { return this._transactions; }

  /**
   * @returns the object structure to be saved in the karma db
   */
  toKarmaFormat = () => ({
    userId: this._userId,
    name: this._account.name,
    mask: this._account.mask,
    type: this._account.type,
    subtype: this._account.subtype,
    status: CardStatus.Linked,
    institution: this._institution.name,
    integrations: {
      plaid: {
        accessToken: this._accessToken,
        accountId: `${this._account.id}`,
        items: Array.from(this._plaid_items),
        publicToken: this._publicToken,
        linkSessionId: this._linkSessionId,
        institutionId: this._institution.institution_id,
      },
    },
  });

  _totalTransactionsForThisCard = 0;
  mapTransactions = async (plaidTransactions: PlaidTransaction[]) => {
    const unmappedTransactions = [];
    const duplicateTransactions = [];

    for (const transaction of plaidTransactions) {
      if (`${transaction.account_id}` === `${this._account.id}` && !this._transactionsIndex.has(`${transaction.transaction_id}`)) {
        // this transaction is for this card, and is not a duplicate
        this._transactionsIndex.add(`${transaction.transaction_id}`);
        const existingTransaction = this._transactions.find(t => `${t.transactionId}` === `${transaction.transaction_id}`);

        const _transaction = new Transaction(this._userId, this._id, transaction);

        if (!!existingTransaction) {
          // TODO: this transacton id already exists in allTransactions, need to get status from NEWEST instance
          this._duplicateTransactions.push(_transaction);
        } else {
          this._transactions.push(_transaction);
        }
      } else if (this._transactionsIndex.has(`${transaction.transaction_id}`)) {
        duplicateTransactions.push(transaction);
      } else {
        unmappedTransactions.push(transaction);
      }
    }

    if (this._account.id === '1jvKqP5qvXCXAw494ORwczXwEaZ5BnUmEADXo') {
      console.log(`total: ${this._transactions.length}`);
    }
    return { unmappedTransactions, duplicateTransactions };
  };

  save = async () => {
    // fingerprinting accounts=>cards since account ids
    // returned from Plaid could change.
    let card = await CardModel.findOne({
      userId: this._userId,
      name: this._account.name,
      mask: this._account.mask,
      type: this._account.type,
      subtype: this._account.subtype,
      institution: this._institution.name,
    });

    if (!!card) {
      Object.entries(this.toKarmaFormat()).forEach(([key, value]) => {
        // force casting here to avoid no string as index error
        (card as any)[key] = value;
      });
      card.lastModified = dayjs().utc().toDate();
    } else {
      card = new CardModel({
        ...this.toKarmaFormat(),
        createdOn: dayjs().utc().format(),
      });
      this._isNew = true;
    }

    this._card = await card.save();
  };

  /**
   * updates this instances plaid account by trackign the new
   * plaid item id in the list of all plaid items and replacing
   * the existing account object
   *
   * @param {Object} account - the plaid account object to update this instance with
   */
  update = (account: AccountBase, plaidItem: TransactionsGetResponse) => {
    this._plaid_items.add(`${plaidItem.item_id}`);
    this._account = account;
    this._accessToken = `${plaidItem.access_token}`;

    // TODO: determine if need to update or ignore new account...
    // - is there some date that can be used to verify?
    // - could use the lastUpdated property on the plaid item?
  };
}

export default Card;
