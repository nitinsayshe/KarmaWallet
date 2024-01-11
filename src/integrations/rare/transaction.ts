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
import { IGroup } from '../../models/group';
import { ISectorDocument } from '../../models/sector';

dayjs.extend(utc);

export interface IRareUser {
  external_id: string;
  user_id: string;
}

export interface IRareTransaction {
  transaction_id: string;
  amt: number;
  currency: string;
  certificate_url?: string;
  statement_descriptor: string;
  processed: boolean;
  processed_ts: string;
  refunded?: boolean;
  refunded_ts?: string;
  user: IRareUser;
  card: IRareCard;
}

export class Transaction {
  private __user: IUserDocument = null;
  private __company: ICompanyDocument = null;
  private __card: Card = null;
  private _rareTransaction: IRareTransaction = null;
  private _transaction: ITransactionDocument = null;
  private __sector: ISectorDocument = null;
  private __group: IGroup = null;
  private __matchType: MatchTypes = null;

  constructor(user: IUserDocument, company: ICompanyDocument, card: Card, rareTransaction: IRareTransaction) {
    if (!user) throw new CustomError('Rare Integration Trasaction Error - no user provided', ErrorTypes.INVALID_ARG);
    // TODO: add Rare as company in DB. Until then, company should be set to null
    // if (!company) throw new CustomError('Rare Integration Transaction Error - no company provided', ErrorTypes.INVALID_ARG);
    if (!card) throw new CustomError('Rare Integration Transaction Error - no card provided');
    if (!rareTransaction) throw new CustomError('Rare Integration Transaction Error - no rare transaction provided', ErrorTypes.INVALID_ARG);

    this.__user = user;
    this.__company = company;
    this.__card = card;
    this._rareTransaction = rareTransaction;
  }

  get _user() { return this._transaction?.user || this.__user._id; }
  get _card() { return this._transaction?.card || this.__card._id; }
  get _company() { return this._transaction?.company || this?.__company?._id; }
  get _amount() { return this._transaction?.amount || this._rareTransaction.amt; }
  get _date() { return this._transaction?.date || new Date(this._rareTransaction.processed_ts); }
  get _sector() { return this.__sector; }
  get _matchType() { return this.__matchType; }
  set _matchType(matchType: MatchTypes) { this.__matchType = matchType; }
  get _group() { return this.__group; }
  set _group(group: IGroup) { this.__group = group; }

  load = async () => {
    // TODO: add Rare as company in DB. Until then, sector should be set to null
    // ................................................................staging........................prod
    // this.__sector = await SectorModel.findOne({ _id: { $in: ['62192ef2f022c9e3fbff0b52', '621b9adb5f87e75f53666fde'] } });
  };

  toKarmaFormat = () => {
    const transaction: Partial<ITransaction> = {
      user: this._user,
      card: this._card,
      company: this._company,
      amount: this._amount,
      date: this._date,
      sortableDate: this._date,
      integrations: this._transaction?.integrations || {
        rare: {
          ...this._rareTransaction,
          projectName: 'Catch Carbon Project',
        },
      },
      sector: this._sector,
    };
    const matchType = this._matchType;
    if (matchType) transaction.matchType = matchType;
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
