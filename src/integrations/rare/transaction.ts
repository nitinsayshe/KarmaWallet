import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  ITransaction,
  ITransactionDocument, MatchTypes, TransactionModel,
} from '../../models/transaction';
import { IUserDocument } from '../../models/user';
import { ICompanyDocument } from '../../models/company';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { Card, IRareCard } from './card';
import { IPlaidCategoryMappingDocument, PlaidCategoryMappingModel } from '../../models/plaidCategoryMapping';
import { IGroupDocument } from '../../models/group';

dayjs.extend(utc);

export interface IRareUser {
  external_id: string;
  user_id: string;
}

export interface IRareTransaction {
  transaction_id: string;
  amt: number;
  currency: string;
  certificate_url: string;
  statement_descriptor: string;
  processed: boolean;
  processed_ts: string;
  refunded: boolean;
  refunded_ts: string;
  user: IRareUser;
  card: IRareCard;
}

export class Transaction {
  private _user: IUserDocument = null;
  private _company: ICompanyDocument = null;
  private _card: Card = null;
  private _rareTransaction: IRareTransaction = null;
  private _transaction: ITransactionDocument = null;
  private _plaidCategoryMapping: IPlaidCategoryMappingDocument = null;
  private __group: IGroupDocument = null;
  private __matchType: MatchTypes = null;

  constructor(user: IUserDocument, company: ICompanyDocument, card: Card, rareTransaction: IRareTransaction) {
    if (!user) throw new CustomError('Rare Integration Trasaction Error - no user provided', ErrorTypes.INVALID_ARG);
    if (!company) throw new CustomError('Rare Integration Transaction Error - no company provided', ErrorTypes.INVALID_ARG);
    if (!card) throw new CustomError('Rare Integration Transaction Error - no card provided');
    if (!rareTransaction) throw new CustomError('Rare Integration Transaction Error - no rare transaction provided', ErrorTypes.INVALID_ARG);

    this._user = user;
    this._company = company;
    this._card = card;
    this._rareTransaction = rareTransaction;
  }

  get _userId() { return this._transaction?.userId || this._user._id; }
  get _cardId() { return this._transaction?.cardId || this._card._id; }
  get _companyId() { return this._transaction?.companyId || this._company._id; }
  get _amount() { return this._transaction?.amount || this._rareTransaction.amt; }
  get _date() { return this._transaction?.date || new Date(this._rareTransaction.processed_ts); }
  get _category() { return 10; } // hardcoding for now
  get _subCategory() { return 100002; } // hard coding for now
  get _matchType() { return this.__matchType; }
  set _matchType(matchType: MatchTypes) { this.__matchType = matchType; }
  get _group() { return this.__group; }
  set _group(group: IGroupDocument) { this.__group = group; }

  load = async () => {
    this._plaidCategoryMapping = await PlaidCategoryMappingModel.findOne({ _id: '61e96acb12e95f10dcdcf00e' });
  };

  toKarmaFormat = () => {
    const transaction: Partial<ITransaction> = {
      userId: this._userId,
      cardId: this._cardId,
      companyId: this._companyId,
      amount: this._amount,
      date: this._date,
      integrations: this._transaction?.integrations || {
        rare: {
          ...this._rareTransaction,
          projectName: 'Catch Carbon Project',
        },
      },
      category: this._category,
      subCategory: this._subCategory,
      carbonMultiplier: this._plaidCategoryMapping,
      matchType: this._matchType,
    };
    const group = this._group;
    if (group) {
      transaction.association = {
        group,
      };
    }
    return transaction;
  };

  save = async () => {
    try {
      if (this._transaction) {
        // this transaction  already exists in the karma db
        // only need to save if diff is found
      } else {
        const transaction = new TransactionModel(this.toKarmaFormat());
        const now = dayjs().utc().toDate();
        transaction.createdOn = now;
        transaction.lastModified = now;

        this._transaction = await transaction.save();
      }
    } catch (err) {
      throw asCustomError(err);
    }
  };
}
