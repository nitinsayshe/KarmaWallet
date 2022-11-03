import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ObjectId, Schema } from 'mongoose';
import { Transaction as IPlaidTransaction } from 'plaid';
import {
  ITransaction, ITransactionIntegrations, ITransactionModel, TransactionModel,
} from '../../models/transaction';

dayjs.extend(utc);

// TODO: add new sectors property

class Transaction {
  _user: Schema.Types.ObjectId = null;
  _company: Schema.Types.ObjectId = null;
  _card: Schema.Types.ObjectId = null;
  _transaction: ITransactionModel = null;
  _plaidTransaction: IPlaidTransaction;
  _sector: Schema.Types.ObjectId = null;
  _date: Dayjs = null;
  _existingTransactionId: Schema.Types.ObjectId = null;

  constructor(
    userId: Schema.Types.ObjectId,
    cardId: Schema.Types.ObjectId,
    plaidTransaction: IPlaidTransaction,
    _existingTransactionId?: Schema.Types.ObjectId,
  ) {
    this._user = userId;
    this._card = cardId;
    this._plaidTransaction = plaidTransaction;
    this._existingTransactionId = _existingTransactionId;
    // this._transaction = transaction;
    this.sterilize();
  }

  get amount() {
    return this._transaction?.amount
    || this._plaidTransaction.amount;
  }
  get company() { return this._company; }
  get date() {
    if (!this._date) {
      this._date = dayjs('1970-01-01T00:00:00.000+00:00').utc();
      const parsedDate = this._plaidTransaction.date.split('-');
      this._date = this._date.set('year', parseInt(parsedDate[0]));
      this._date = this._date.set('month', parseInt(parsedDate[1]) - 1);
      this._date = this._date.set('date', parseInt(parsedDate[2]));
    }

    return this._date;
  }
  get isValid() {
    return !!this._user
      && !!this._card
      && !!this._plaidTransaction;
  }
  get merchant_name() {
    return this._transaction?.integrations?.plaid?.merchant_name
      || this._plaidTransaction.merchant_name;
  }
  get name() {
    return this._transaction?.integrations?.plaid?.name
      || this._plaidTransaction.name;
  }
  get plaidTransaction() {
    return this._plaidTransaction;
  }
  get sector() { return this._sector; }
  get transactionId() {
    return this._transaction?.integrations?.plaid?.transaction_id
      || this._plaidTransaction.transaction_id;
  }

  /**
   * @returns transaction structure to be saved in the karma db
   */
  toKarmaFormat = (): Partial<ITransaction> => ({
    user: this._user,
    card: this._card,
    company: this.company,
    amount: this.amount,
    date: this.date.toDate(),
    integrations: this._transaction?.integrations || {
      plaid: this._plaidTransaction,
    },
    sector: this._sector,
  });

  /**
   * tests a transactions fingerprint to see if is equal
   * to another transaction.
   *
   * @param {Transaction} transaction
   * @returns boolean
   */
  equals = (transaction: Transaction) => transaction.merchant_name === this._plaidTransaction.merchant_name
      && transaction.name === this._plaidTransaction.name
      && transaction.amount === this._plaidTransaction.amount;

  setSector = (sector: ObjectId) => {
    this._sector = sector;
  };

  setCompany = (id: Schema.Types.ObjectId) => {
    this._company = id;
  };

  sterilize = () => {
    // removes lagacy company info from transaction
    if ((this._transaction as any)?.companyInfo) delete (this._transaction as any).companyInfo;
  };

  save = async (onComplete: (actionType: 'new' | 'update') => void) => {
    let actionType: 'new' | 'update' = null;

    if (this.isValid) {
      this._transaction = await TransactionModel.findOne({
        $or: [
          {
            _id: this._existingTransactionId,
          },
          {
            'integrations.plaid.transaction_id': this._plaidTransaction.transaction_id,
          },
          {
            $and: [
              { 'integrations.plaid.pending_transaction_id': this._plaidTransaction.pending_transaction_id },
              { 'integrations.plaid.pending_transaction_id': { $ne: null } },
            ],
          },
          {
            $and: [
              { user: this._user },
              { card: this._card },
              { company: this.company },
              { amount: this._plaidTransaction.amount },
              {
                $or: [
                  { 'integrations.plaid.name': this._plaidTransaction.name },
                  { 'integrations.plaid.merchant_name': this._plaidTransaction.merchant_name },
                ],
              },
              { date: this.date.toDate() },
              { 'integrations.plaid.merchant_name': this._plaidTransaction.merchant_name },
              // { 'integrations.plaid.authorized_date': this._plaidTransaction.authorized_date },
            ],
          },
        ],
      });

      /**
       * if the transaction already exists, we will update it
       * otherwise, will create a new transaction.
       */
      if (!!this._transaction) {
        actionType = 'update';
        // TODO: figure out what fields should be allowed to be updated???
        // dont want to just overwrite enter transaction.
        Object.entries(this.toKarmaFormat()).forEach(([key, value]) => {
          if (key === 'date') {
            this._transaction.date = this.date.toDate();
          } else if (key === 'integrations') {
            this._transaction.integrations.plaid = (value as ITransactionIntegrations).plaid;
          } else {
            // force cast here to avoid string string as index error
            (this._transaction as any)[key] = value;
          }
        });

        if (!!this._sector) this._transaction.sector = this._sector;

        this._transaction.lastModified = dayjs().utc().toDate();
        onComplete?.(actionType);
      } else {
        actionType = 'new';
        this._transaction = new TransactionModel({
          ...this.toKarmaFormat(),
          createdOn: dayjs().utc().toDate(),
        });
        onComplete?.(actionType);
      }

      await this._transaction.save();
    }
  };
}

export default Transaction;
