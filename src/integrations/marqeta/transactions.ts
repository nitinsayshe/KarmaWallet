import dayjs from 'dayjs';
import { parseInt } from 'lodash';
import { ObjectId } from 'mongoose';
import { Transaction } from 'plaid';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { Transactions } from '../../clients/marqeta/transactions';
import {
  TransactionModel,
  TransactionModelStateEnum,
  TransactionModelStateEnumValues,
  TransactionModelTypeEnum,
  TransactionModelTypeEnumValues,
} from '../../clients/marqeta/types';
import { ErrorTypes } from '../../lib/constants';
import {
  AdjustmentTransactionTypeEnum,
  CreditTransactionTypeEnum,
  DebitTransactionTypeEnum,
  DepositTransactionTypeEnum,
  TransactionCreditSubtypeEnum,
  TransactionSubtypeEnumValues,
  TransactionTypeEnum,
  TransactionTypeEnumValues,
  TriggerClearedTransactionTypeEnum,
  TriggerCreateTransactionTypeEnum,
  TriggerDeclinedTransactionTypeEnum,
  TriggerPendingTransactionTypeEnum,
} from '../../lib/constants/transaction';
import CustomError from '../../lib/customError';
import { saveDocuments } from '../../lib/model';
import { CardModel } from '../../models/card';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { ISectorDocument, SectorModel } from '../../models/sector';
import { ITransactionDocument, TransactionModel as MongooseTransactionModel } from '../../models/transaction';
import { UserModel } from '../../models/user';
import { matchTransactionCompanies } from '../../services/transaction';
import { IRef } from '../../types/model';
import { IRequest } from '../../types/request';
import { IMatchedTransaction } from '../plaid/types';
import {
  EnrichedMarqetaTransaction,
  GpaOrderTagEnum,
  IMarqetaMakeTransaction,
  IMarqetaMakeTransactionAdvice,
  IMarqetaMakeTransactionClearing,
  ListTransactionsResponse,
} from './types';

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

export const mapMarqetaTransactionToPlaidTransaction = (marqetaTransactions: TransactionModel[]): EnrichedMarqetaTransaction[] => {
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
          const company = await getCompanyByMCC(parseInt((t as EnrichedMarqetaTransaction)?.marqeta_transaction?.card_acceptor?.mcc, 10));
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
): Promise<{ transaction: ITransactionDocument | null; inProcessingTransactions: boolean }> => {
  // see if we're pocessing it right now
  // it would have to be already mapped to a kw transaction at this point.
  const existingProcessingTransaction = procesingTransactions.find((t) => t?.integrations?.marqeta?.token === token);
  if (!!existingProcessingTransaction) {
    console.log(`Found existing processing transaction with token in procesingTransactions: ${token}`);
    return { transaction: existingProcessingTransaction, inProcessingTransactions: true };
  }
  try {
    const existingTransaction = await MongooseTransactionModel.findOne({
      $and: [{ 'integrations.marqeta.token': { $exists: true } }, { 'integrations.marqeta.token': token }],
    });
    if (!existingTransaction?._id) {
      throw Error(`No transaction found with token: ${token}`);
    }
    console.log(`Found existing processing transaction with token in db: ${token}`);
    return { transaction: existingProcessingTransaction, inProcessingTransactions: false };
  } catch (err) {
    console.error(err);
    console.error(`Error looking up transaction with marqeta token: ${token}}`);
    return { transaction: null, inProcessingTransactions: false };
  }
};

// Mappings were worked on on the google doc:
// https://docs.google.com/document/d/1IxIzh-6Bn_wFa7zoNKOQVbTqNbmR6KB78eaXzOM4fdM/edit
const getTransactionTypeFromMarqetaTransactionType = (
  marqetaTransactionType: TransactionModelTypeEnumValues,
): TransactionTypeEnumValues | undefined => {
  if (!!Object.values(DepositTransactionTypeEnum).find((t) => t === marqetaTransactionType)) {
    return TransactionTypeEnum.Deposit;
  }
  if (!!Object.values(DebitTransactionTypeEnum).find((t) => t === marqetaTransactionType)) {
    return TransactionTypeEnum.Debit;
  }
  if (!!Object.values(CreditTransactionTypeEnum).find((t) => t === marqetaTransactionType)) {
    return TransactionTypeEnum.Credit;
  }
  if (!!Object.values(AdjustmentTransactionTypeEnum).find((t) => t === marqetaTransactionType)) {
    return TransactionTypeEnum.Adjustment;
  }
  return undefined;
};

const getUpdatedTransactionStatusFromRelatedTransactionType = (type: TransactionModelTypeEnumValues): TransactionModelStateEnumValues => {
  if (!!Object.values(TriggerClearedTransactionTypeEnum).find((t) => t === type)) {
    return TransactionModelStateEnum.Cleared;
  }
  if (!!Object.values(TriggerPendingTransactionTypeEnum).find((t) => t === type)) {
    return TransactionModelStateEnum.Pending;
  }
  if (!!Object.values(TriggerDeclinedTransactionTypeEnum).find((t) => t === type)) {
    return TransactionModelStateEnum.Declined;
  }
  return undefined; // return TransactionModelStateEnum.Error instead?
};

const getSubtypeAndTypeFromMarqetaTransaction = (
  t: TransactionModel,
): { subType?: TransactionSubtypeEnumValues; type?: TransactionTypeEnumValues } => {
  const type = getTransactionTypeFromMarqetaTransactionType(t.type);

  if (type !== TransactionTypeEnum.Credit) {
    // we only have subtypes for credit transactions right now
    return { subType: undefined, type };
  }

  const isRefund = t.type === TransactionModelTypeEnum.Refund;
  if (isRefund) {
    return { subType: TransactionCreditSubtypeEnum.Refund, type };
  }

  const isGPAOrderWithTags = t.type === TransactionModelTypeEnum.GpaCredit && !!t.gpa_order.tags;
  if (isGPAOrderWithTags) {
    // seperate the coma seperated tags
    const tags = t.gpa_order.tags.split(',');
    // tags should only contain one of the following:
    if (tags.includes(GpaOrderTagEnum.CashbackPayout)) {
      return { subType: TransactionCreditSubtypeEnum.Cashback, type };
    }
    if (tags.includes(GpaOrderTagEnum.EmployerGifting)) {
      return { subType: TransactionCreditSubtypeEnum.Employer, type };
    }
  }
};

const getNewOrUpdatedTransactionFromMarqetaTransaction = async (
  t: EnrichedMarqetaTransaction,
  processingTransactions: ITransactionDocument[] = [],
): Promise<ITransactionDocument> => {
  // check if this transaction already exists in the db
  const lookupToken = t?.marqeta_transaction?.preceding_related_transaction_token || t?.marqeta_transaction?.token;
  const { transaction: existingTransaction, inProcessingTransactions } = await getExistingTransactionFromMarqetaTransacationToken(
    lookupToken,
    processingTransactions,
  );
  console.log('existingTransaction', JSON.stringify(existingTransaction));
  const isTypeThatTriggersNewTransactionCreation = !!Object.values(TriggerCreateTransactionTypeEnum)?.find(
    (type) => type === t.marqeta_transaction.type,
  );
  if (!!existingTransaction && !isTypeThatTriggersNewTransactionCreation) {
    console.log(`Updating existing transaciton: ${JSON.stringify(existingTransaction)}`);
    const hasPrecedingRelatedTransactionToken = !!t?.marqeta_transaction?.preceding_related_transaction_token;
    if (hasPrecedingRelatedTransactionToken) {
      const updatedStatus = getUpdatedTransactionStatusFromRelatedTransactionType(t.marqeta_transaction.type);
      existingTransaction.integrations.marqeta = {
        ...existingTransaction.integrations.marqeta,
        relatedTransactions: !!existingTransaction?.integrations?.marqeta?.relatedTransactions
          ? [...existingTransaction.integrations.marqeta.relatedTransactions, t.marqeta_transaction]
          : [t.marqeta_transaction],
      };
      existingTransaction.status = updatedStatus || existingTransaction.status;
    } else {
      existingTransaction.integrations.marqeta = t.marqeta_transaction;
      existingTransaction.status = t.marqeta_transaction.state;
    }
    existingTransaction.amount = t.amount;

    if (inProcessingTransactions) {
      processingTransactions = processingTransactions.map((transaction) => {
        if (transaction.integrations.marqeta.token === existingTransaction.integrations.marqeta.token) {
          return existingTransaction;
        }
        return transaction;
      });
      return;
    }
    return existingTransaction;
  }

  const newTransaction = new MongooseTransactionModel();
  let sector = null;
  let company = null;

  if (!!(t as EnrichedMarqetaTransaction & { company: ObjectId }).company) {
    ({ company, sector } = await getCompanyAndSectorFromMarqetaTransaction(t as EnrichedMarqetaTransaction & { company: ObjectId }));
  } else {
    sector = await getSectorFromMCC(parseInt((t as EnrichedMarqetaTransaction).marqeta_transaction?.card_acceptor?.mcc, 10));
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
    throw new CustomError(`Error looking up the user associated with this transaction: ${JSON.stringify(t)} `, ErrorTypes.SERVER);
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
    throw new CustomError(`Error looking up the card associated with this transaction: ${JSON.stringify(t)} `, ErrorTypes.SERVER);
  }

  const toDate = (date: string): Date | null => {
    if (!date) return null;
    try {
      return new Date(date);
    } catch (err) {
      console.log(`Error parsing date: ${date}`);
      return null;
    }
  };

  const types = getSubtypeAndTypeFromMarqetaTransaction(t.marqeta_transaction);
  newTransaction.amount = t.amount;
  newTransaction.status = t.marqeta_transaction.state;
  newTransaction.integrations.marqeta = t.marqeta_transaction;
  newTransaction.type = types.type;
  newTransaction.subType = types.subType;
  newTransaction.date = toDate(t?.marqeta_transaction?.created_time)
    || toDate(t?.marqeta_transaction?.local_transaction_date)
    || toDate(t?.marqeta_transaction?.user_transaction_time);

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
    try {
      const updatedTransaction = await getNewOrUpdatedTransactionFromMarqetaTransaction(allTransactions[i], updatedOrNewTransactions);
      if (!!updatedTransaction) {
        if (!updatedOrNewTransactions.find((t) => t._id.toString() === updatedTransaction._id.toString())) {
          updatedOrNewTransactions.push(updatedTransaction);
        } else {
          updatedOrNewTransactions.map((t) => {
            if (t._id.toString() === updatedTransaction._id.toString()) {
              return updatedTransaction;
            }
            return t;
          });
        }
      }
    } catch (err) {
      console.error(`Error mapping marqeta transaction to karma transaction: ${JSON.stringify(allTransactions[i])}`);
      console.error(err);
    }
  }

  return updatedOrNewTransactions;
};

export const mapAndSaveMarqetaTransactionsToKarmaTransactions = async (
  marqetaTransactions: TransactionModel[],
): Promise<ITransactionDocument[]> => {
  const transactionsToSave = await mapMarqetaTransactionsToKarmaTransactions(marqetaTransactions, true);
  return saveDocuments(transactionsToSave) as unknown as ITransactionDocument[];
};
