import { Transaction } from 'plaid';
import { ObjectId } from 'mongoose';
import { parseInt } from 'lodash';
import { Transactions } from '../../clients/marqeta/transactions';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';
import {
  EnrichedMarqetaTransaction,
  IMarqetaMakeTransaction,
  IMarqetaMakeTransactionAdvice,
  IMarqetaMakeTransactionClearing,
  ListTransactionsResponse,
} from './types';

import { TransactionModel } from '../../clients/marqeta/types';
import { matchTransactionCompanies } from '../../services/transaction';
import { ITransactionDocument, TransactionModel as MongooseTransactionModel } from '../../models/transaction';
import { IMatchedTransaction } from '../plaid/types';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import transaction from '../plaid/transaction';
import { ISectorDocument, SectorModel } from '../../models/sector';
import { IRef } from '../../types/model';
import { UserModel } from '../../models/user';
import { CardModel } from '../../models/card';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the GPA class
const transactions = new Transactions(marqetaClient);

export const makeTransaction = async (req: IRequest<{}, {}, IMarqetaMakeTransaction>) => {
  const params = req.body;
  const userResponse = await transactions.makeTransaction(params);
  return { data: userResponse };
};

export const makeTransactionAdvice = async (req: IRequest<{}, {}, IMarqetaMakeTransactionAdvice>) => {
  const params = req.body;
  const userResponse = await transactions.makeTransactionAdvice(params);
  return { data: userResponse };
};

export const makeTransactionClearing = async (req: IRequest<{}, {}, IMarqetaMakeTransactionClearing>) => {
  const params = req.body;
  const userResponse = await transactions.makeTransactionClearing(params);
  return { data: userResponse };
};

export const listTransaction = async (
  req: IRequest<{}, { userToken: string; cardToken: string }, {}>,
): Promise<ListTransactionsResponse> => {
  const params = req.query;
  const userResponse = await transactions.listTransaction(params);
  return { data: userResponse };
};

export const mapMarqetaTransactionToPlaidTransaction = (
  marqetaTransactions: TransactionModel[],
): (Transaction & { marqeta_transaction: TransactionModel }
  )[] => {
  const mapped: (Transaction & { marqeta_transaction: TransactionModel })[] = marqetaTransactions
    ?.map((t) => {
      if (!t?.card_acceptor?.name && !t?.merchant?.name && !t?.card_acceptor?.mcc) {
        return null;
      }
      return {
        name: t?.card_acceptor?.name || t?.merchant?.name,
        amount: t?.amount,
        merchant_name: t?.merchant?.name || t?.card_acceptor?.name,
        marqeta_transaction: t, // adding this on here for referencing after matching
      } as Transaction & { marqeta_transaction: TransactionModel };
    })
    .filter((t) => !!t);
  return mapped;
};

export const getCompanyByMCC = async (mcc: number): Promise<ICompanyDocument> => {
  try {
    const company = await CompanyModel.findOne({ mcc });
    if (!company?._id) {
      throw Error(`No company found for mcc: ${mcc}`);
    }
    return company;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const matchTransactionsToCompaniesByMCC = async (
  matched: (EnrichedMarqetaTransaction & IMatchedTransaction)[],
  notMatched: EnrichedMarqetaTransaction[],
): Promise<{
    matched: (EnrichedMarqetaTransaction & IMatchedTransaction
    )[];
    notMatched: EnrichedMarqetaTransaction[];
  }> => {
  matched = [
    ...matched,
    ...(await Promise.all(
      notMatched
        .map(async (t) => {
          const company = await getCompanyByMCC(
            parseInt((t as EnrichedMarqetaTransaction)?.marqeta_transaction?.card_acceptor?.mcc, 10),
          );
          if (!company?._id) {
            return null;
          }
          // move matched transaction out of notMatched
          notMatched = notMatched.filter((n) => t?.marqeta_transaction?.token !== n?.marqeta_transaction?.token);
          (t as IMatchedTransaction).company = company._id;
          return t;
        })
        .filter((t) => !!t),
    )),
  ];
  return { matched, notMatched };
};

const getCompanyAndSectorFromMarqetaTransaction = async (
  t: EnrichedMarqetaTransaction & { company: ObjectId },
): Promise<{ company: IRef<ObjectId, ICompanyDocument> | null; sector: IRef<ObjectId, ISectorDocument> }> => {
  try {
    const companyId = t.company;
    const company = await CompanyModel.findById(companyId);
    if (!company?._id) {
      console.error(`No company with id ${companyId} found`);
    }
    const sector = company.sectors.find((s) => s.primary)?.sector as IRef<ObjectId, ISectorDocument>;
    return { company, sector };
  } catch (err) {
    console.error(`Error getting company from transaction match: ${JSON.stringify(t)} `);
    console.error(err);
  }
};

const getSectorFromMCC = async (mcc: number): Promise<IRef<ObjectId, ISectorDocument> | null> => {
  try {
    const sector = await SectorModel.findOne({ mccs: mcc });
    if (!sector?._id) {
      console.error(`No sector with mcc ${mcc} found`);
    }
    return sector;
  } catch (err) {
    console.error(`Error getting sector from mcc: ${mcc} `);
    console.error(err);
  }
};

const createNewTransactionFromMarqetaTransaction = async (t: Transaction): Promise<ITransactionDocument> => {
  const marqetaMatchedTransaction = t as Transaction & { marqeta_transaction: TransactionModel };

  const newTransaction = new MongooseTransactionModel();
  let sector = null;
  let company = null;

  if (!!(t as EnrichedMarqetaTransaction & { company: ObjectId }).company) {
    ({ company, sector } = await getCompanyAndSectorFromMarqetaTransaction(
      t as EnrichedMarqetaTransaction & { company: ObjectId },
    ));
  } else {
    sector = await getSectorFromMCC(
      parseInt((t as EnrichedMarqetaTransaction).marqeta_transaction?.card_acceptor?.mcc, 10),
    );
  }

  if (!!sector) newTransaction.sector = sector;
  if (!!company) newTransaction.company = company;

  try {
    const user = await UserModel.findOne({
      'integrations.marqeta.userToken': marqetaMatchedTransaction?.marqeta_transaction?.user_token,
    });
    if (!user?._id) {
      throw Error(
        `No user found associated with the marqeta user token :${marqetaMatchedTransaction?.marqeta_transaction?.user_token}`,
      );
    }
    newTransaction.user = user;
  } catch (err) {
    console.error(err);
    throw new CustomError(
      `Error looking up the user associated with this transaction: ${JSON.stringify(t)} `,
      ErrorTypes.SERVER,
    );
  }

  try {
    const card = await CardModel.findOne({
      'integrations.marqeta.token': marqetaMatchedTransaction?.marqeta_transaction?.card_token,
    });
    if (!card?._id) {
      throw Error(
        `No card found associated with the marqeta card token :${marqetaMatchedTransaction?.marqeta_transaction?.card_token}`,
      );
    }
    newTransaction.card = card;
  } catch (err) {
    console.error(err);
    throw new CustomError(
      `Error looking up the card associated with this transaction: ${JSON.stringify(t)} `,
      ErrorTypes.SERVER,
    );
  }
  newTransaction.amount = marqetaMatchedTransaction.amount;
  newTransaction.status = marqetaMatchedTransaction.marqeta_transaction.state;
  newTransaction.integrations.marqeta = marqetaMatchedTransaction.marqeta_transaction;
  return newTransaction;
};

// Note: this only creates the transaction documents, which would still need to be saved to the db
export const mapMarqetaTransactionToKarmaTransaction = async (
  marqetaTransactions: TransactionModel[],
  saveMatches = false,
): Promise<ITransactionDocument[]> => {
  const mapped = mapMarqetaTransactionToPlaidTransaction(marqetaTransactions);
  let { matched, notMatched } = await matchTransactionCompanies(mapped, saveMatches);

  ({ matched, notMatched } = await matchTransactionsToCompaniesByMCC(
    matched as (EnrichedMarqetaTransaction & { company: ObjectId })[],
    notMatched as EnrichedMarqetaTransaction[],
  ));

  if (notMatched.length > 0) {
    console.log(`no matches found for ${notMatched.length} transactions`);
  }

  // merge matched and notMatched back together
  const allTransactions = [...matched, ...notMatched];

  if (!matched?.length || matched.length < 1) {
    throw new CustomError(`No match found for request: ${JSON.stringify(transaction)} `, ErrorTypes.SERVER);
  }

  // map matched transactions to db transactions
  const transactionDocuments: ITransactionDocument[] = await Promise.all(
    allTransactions.map(async (t) => createNewTransactionFromMarqetaTransaction(t)),
  );

  return transactionDocuments;
};
