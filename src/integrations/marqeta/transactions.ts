import { Transaction } from 'plaid';
import { ObjectId } from 'mongoose';
import { parseInt } from 'lodash';
import dayjs from 'dayjs';
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
import { ISectorDocument, SectorModel } from '../../models/sector';
import { IRef } from '../../types/model';
import { UserModel } from '../../models/user';
import { CardModel } from '../../models/card';
import { saveDocuments } from '../../lib/model';

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
): EnrichedMarqetaTransaction[] => {
  const mapped: (Transaction & { marqeta_transaction: TransactionModel })[] = marqetaTransactions
    ?.map(
      (t) => ({
        name: t?.card_acceptor?.name || t?.merchant?.name,
        amount: t?.amount,
        merchant_name: t?.card_acceptor?.name || t?.merchant?.name,
        marqeta_transaction: t, // adding this on here for referencing after matching
      }) as Transaction & { marqeta_transaction: TransactionModel },
    )
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
    ...(
      await Promise.all(
        notMatched.map(async (t) => {
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
        }),
      )
    ).filter((t) => !!t),
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
      return { company: null, sector: null };
    }
    const sector = company.sectors.find((s) => s.primary)?.sector as IRef<ObjectId, ISectorDocument>;
    return { company, sector };
  } catch (err) {
    console.error(`Error getting company from transaction match: ${JSON.stringify(t)} `);
    console.error(err);
    return { company: null, sector: null };
  }
};

const getSectorFromMCC = async (mcc: number): Promise<IRef<ObjectId, ISectorDocument> | null> => {
  if (!mcc || isNaN(mcc)) return null;
  try {
    const sector = await SectorModel.findOne({ mccs: mcc });
    if (!sector?._id) {
      console.error(`No sector with mcc ${mcc} found`);
      return null;
    }
    return sector;
  } catch (err) {
    console.error(`Error getting sector from mcc: ${mcc} `);
    console.error(err);
    return null;
  }
};

const getExistingTransactionFromMarqetaTransacationToken = async (
  token: string,
  procesingTransactions: ITransactionDocument[] = [],
): Promise<ITransactionDocument | null> => {
  // see if we're pocessing it right now
  // it would have to be already mapped to a kw transaction at this point.
  const existingProcessingTransaction = procesingTransactions.find((t) => t?.integrations?.marqeta?.token === token);
  if (!!existingProcessingTransaction) {
    return existingProcessingTransaction;
  }
  try {
    const existingTransaction = await MongooseTransactionModel.findOne({
      $and: [{ 'integrations.marqeta.token': { $exists: true } }, { 'integrations.marqeta.token': token }],
    });
    if (!existingTransaction?._id) {
      throw Error(`No transaction found with token: ${token}`);
    }
    return existingTransaction;
  } catch (err) {
    console.error(err);
    console.error(`Error looking up transaction with marqeta token: ${token}}`);
    return null;
  }
};

const getNewOrUpdatedTransactionFromMarqetaTransaction = async (
  t: EnrichedMarqetaTransaction,
  procesingTransactions: ITransactionDocument[] = [],
): Promise<ITransactionDocument> => {
  // check if this transaction already exists in the db
  const lookupToken = t?.marqeta_transaction?.preceding_related_transaction_token || t?.marqeta_transaction?.token;
  const existingTransaction = await getExistingTransactionFromMarqetaTransacationToken(
    lookupToken,
    procesingTransactions,
  );
  if (!!existingTransaction) {
    console.log('Found existing transaction!!!!!!!!!!!!!!!!!!!!');
    console.log(`Updating existing transaciton: ${JSON.stringify(existingTransaction)}`);
    const hasPrecedingRelatedTransactionToken = !!t?.marqeta_transaction?.preceding_related_transaction_token;
    if (hasPrecedingRelatedTransactionToken) {
      existingTransaction.integrations.marqeta = {
        ...existingTransaction.integrations.marqeta,
        relatedTransactions: !!existingTransaction?.integrations?.marqeta?.relatedTransactions
          ? [...existingTransaction.integrations.marqeta.relatedTransactions, t.marqeta_transaction]
          : [t.marqeta_transaction],
      };
    } else {
      existingTransaction.integrations.marqeta = t.marqeta_transaction;
    }
    existingTransaction.status = t.marqeta_transaction.state;
    existingTransaction.amount = t.amount;

    return existingTransaction;
  }

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
      'integrations.marqeta.userToken': t?.marqeta_transaction?.user_token,
    });
    if (!user?._id) {
      throw Error(`No user found associated with the marqeta user token :${t?.marqeta_transaction?.user_token}`);
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
      'integrations.marqeta.token': t?.marqeta_transaction?.card_token,
    });
    if (!card?._id) {
      throw Error(`No card found associated with the marqeta card token :${t?.marqeta_transaction?.card_token}`);
    }
    newTransaction.card = card;
  } catch (err) {
    console.error(err);
    throw new CustomError(
      `Error looking up the card associated with this transaction: ${JSON.stringify(t)} `,
      ErrorTypes.SERVER,
    );
  }
  newTransaction.amount = t.amount;
  newTransaction.status = t.marqeta_transaction.state;
  newTransaction.integrations.marqeta = t.marqeta_transaction;
  newTransaction.date = new Date(t?.marqeta_transaction?.local_transaction_date);
  return newTransaction;
};

export const mapMarqetaTransactionsToKarmaTransactions = async (
  marqetaTransactions: TransactionModel[],
  saveMatches = false,
): Promise<ITransactionDocument[]> => {
  // sort these transactions so they are processed in order
  marqetaTransactions.sort((a, b) => {
    if (dayjs(a.local_transaction_date).isBefore(dayjs(b.local_transaction_date))) {
      return 1;
    }
    if (dayjs(a.local_transaction_date).isAfter(dayjs(b.local_transaction_date))) {
      return -1;
    }
    return 0;
  });

  const mapped = mapMarqetaTransactionToPlaidTransaction(marqetaTransactions);

  // filter out transactions that aren't authorizations
  const authorizations = mapped.filter((t) => t?.marqeta_transaction?.type === 'authorization');
  let { matched, notMatched } = await matchTransactionCompanies(authorizations, saveMatches);
  ({ matched, notMatched } = await matchTransactionsToCompaniesByMCC(
    matched as (EnrichedMarqetaTransaction & { company: ObjectId })[],
    notMatched as EnrichedMarqetaTransaction[],
  ));

  const nonAuthorizations = mapped.filter((t) => t?.marqeta_transaction?.type !== 'authorization');
  notMatched = [...notMatched, ...nonAuthorizations];

  if (matched.length > 0) console.log(`matches found for ${matched?.length} transactions`);
  if (notMatched.length > 0) console.log(`no matches found for ${notMatched?.length} transactions`);

  // merge matched and notMatched back together
  const allTransactions = [
    ...(matched as (EnrichedMarqetaTransaction & { company: ObjectId })[]),
    ...(notMatched as EnrichedMarqetaTransaction[]),
  ];

  // map matched transactions to db transactions
  const updatedOrNewTransactions: ITransactionDocument[] = [];
  for (let i = 0; i < allTransactions.length; i++) {
    updatedOrNewTransactions.push(
      await getNewOrUpdatedTransactionFromMarqetaTransaction(allTransactions[i], updatedOrNewTransactions),
    );
  }

  return updatedOrNewTransactions;
};

export const mapAndSaveMarqetaTransactionsToKarmaTransactions = async (
  marqetaTransactions: TransactionModel[],
): Promise<ITransactionDocument[]> => {
  const transactionsToSave = await mapMarqetaTransactionsToKarmaTransactions(marqetaTransactions, true);
  return saveDocuments(transactionsToSave) as unknown as ITransactionDocument[];
};
