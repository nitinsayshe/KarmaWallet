import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Schema } from 'mongoose';
import { Transaction as IPlaidTransaction } from 'plaid';
import { IPlaidCategoryMappingDocument } from '../../models/plaidCategoryMapping';
import {
  ITransaction, ITransactionIntegrations, ITransactionModel, TransactionModel,
} from '../../models/transaction';

dayjs.extend(utc);

// TODO: add new sectors property

class Transaction {
  _userId: Schema.Types.ObjectId = null;
  _companyId: Schema.Types.ObjectId = null;
  _cardId: Schema.Types.ObjectId = null;
  _transaction: ITransactionModel = null;
  _plaidTransaction: IPlaidTransaction;
  _category: number = null;
  _subCategory: number = null;
  _carbonMultiplier: IPlaidCategoryMappingDocument = null;
  _date: Dayjs = null;

  constructor(userId: Schema.Types.ObjectId, cardId: Schema.Types.ObjectId, plaidTransaction: IPlaidTransaction) {
    this._userId = userId;
    this._cardId = cardId;
    this._plaidTransaction = plaidTransaction;
    // this._transaction = transaction;

    this.steralize();
  }

  get amount() {
    return this._transaction?.amount
    || this._plaidTransaction.amount;
  }
  get companyId() { return this._companyId; }
  get isValid() {
    return !!this._userId
      && !!this._cardId
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
  get date() {
    if (!this._date) {
      this._date = dayjs('1 Jan, 1970');
      const parsedDate = this._plaidTransaction.date.split('-');
      this._date = this._date.set('year', parseInt(parsedDate[0]));
      this._date = this._date.set('month', parseInt(parsedDate[1]) - 1);
      this._date = this._date.set('date', parseInt(parsedDate[2]));
    }

    return this._date;
  }
  get plaidTransaction() {
    return this._plaidTransaction;
  }

  get transactionId() {
    return this._transaction?.integrations?.plaid?.transaction_id
      || this._plaidTransaction.transaction_id;
  }

  /**
   * @returns transaction structure to be saved in the karma db
   */
  toKarmaFormat = (): Partial<ITransaction> => ({
    userId: this._userId,
    cardId: this._cardId,
    companyId: this.companyId,
    amount: this.amount,
    date: this.date.toDate(),
    integrations: this._transaction?.integrations || {
      plaid: this._plaidTransaction,
    },
    category: this._category,
    subCategory: this._subCategory,
    carbonMultiplier: this._carbonMultiplier,
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

  setCarbonMultiplier = (carbonMultiplier: IPlaidCategoryMappingDocument) => {
    this._carbonMultiplier = carbonMultiplier;
  };

  setCategory = (category: number) => {
    this._category = category;
  };

  setCompanyId = (id: Schema.Types.ObjectId) => {
    this._companyId = id;
  };

  setSubCategory = (subcategory: number) => {
    this._subCategory = subcategory;
  };

  steralize = () => {
    // removes lagacy company info from transaction
    if ((this._transaction as any)?.companyInfo) delete (this._transaction as any).companyInfo;
  };

  save = async (onComplete: (actionType: 'new' | 'update') => void) => {
    let actionType: 'new' | 'update' = null;

    if (this.isValid) {
      this._transaction = await TransactionModel.findOne({
        userId: this._userId,
        cardId: this._cardId,
        companyId: this.companyId,
        amount: this._plaidTransaction.amount,
        date: this.date.toDate(),
        'integrations.plaid.merchant_name': this._plaidTransaction.merchant_name,
        'integrations.plaid.authorized_date': this._plaidTransaction.authorized_date,
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

        // add category and carbonMultiplier mapping if found
        if (!!this._category) this._transaction.category = this._category;
        if (!!this._subCategory) this._transaction.subCategory = this._subCategory;
        if (!!this._carbonMultiplier) this._transaction.carbonMultiplier = this._carbonMultiplier;

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
