import dayjs from 'dayjs';
import { parseInt } from 'lodash';
import { ObjectId } from 'mongoose';
import { Transaction } from 'plaid';
import { getMarqetaResources, GetPaginiatedResourceParams } from '.';
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
  RefundTransactionTypeEnum,
  TransactionCreditSubtypeEnum,
  TransactionCreditSubtypeEnumValues,
  TransactionSubtypeEnumValues,
  TransactionTypeEnum,
  TransactionTypeEnumValues,
  TriggerClearedTransactionTypeEnum,
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
  IMarqetaMakeTransaction,
  IMarqetaMakeTransactionAdvice,
  IMarqetaMakeTransactionClearing,
  ListTransactionsResponse,
  PaginatedMarqetaResponse,
} from './types';
import { IMarqetaGPACustomTags } from '../../services/transaction/types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the GPA class
const transactionsClient = new Transactions(marqetaClient);

export const makeTransaction = async (req: IRequest<{}, {}, IMarqetaMakeTransaction>) => {
  const params = req.body;
  const userResponse = await transactionsClient.makeTransaction(params);
  return { data: userResponse };
};

export const makeTransactionAdvice = async (req: IRequest<{}, {}, IMarqetaMakeTransactionAdvice>) => {
  const params = req.body;
  const userResponse = await transactionsClient.makeTransactionAdvice(params);
  return { data: userResponse };
};

export const makeTransactionClearing = async (req: IRequest<{}, {}, IMarqetaMakeTransactionClearing>) => {
  const params = req.body;
  const userResponse = await transactionsClient.makeTransactionClearing(params);
  return { data: userResponse };
};

export const listTransaction = async (
  req: IRequest<{}, { userToken: string; cardToken: string }, {}>,
): Promise<ListTransactionsResponse> => {
  const params = req.query;
  const userResponse = await transactionsClient.listTransaction(params);
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
    console.log(err);
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
            parseInt((t as EnrichedMarqetaTransaction)?.marqeta_transaction?.card_acceptor?.mcc || '-1', 10),
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
      throw new Error(`No company with id ${companyId} found`);
    }
    const sector = company.sectors.find((s) => s.primary)?.sector as IRef<ObjectId, ISectorDocument>;
    return { company, sector };
  } catch (err) {
    console.log(`Error getting company from transaction match: ${JSON.stringify(t)} `);
    console.log(err);
    return { company: null, sector: null };
  }
};

const getSectorFromMCC = async (mcc: number): Promise<IRef<ObjectId, ISectorDocument> | null> => {
  if (!mcc || isNaN(mcc)) return null;
  try {
    const sector = await SectorModel.findOne({ mccs: mcc });
    if (!sector?._id) {
      throw new Error(`No sector with mcc ${mcc} found`);
    }
    return sector;
  } catch (err) {
    console.log(`Error getting sector from mcc: ${mcc} `);
    console.log(err);
    return null;
  }
};

const getExistingTransactionFromMarqetaTransactionToken = async (
  token: string,
  procesingTransactions: ITransactionDocument[] = [],
): Promise<ITransactionDocument | null> => {
  // see if we're pocessing it right now
  // it would have to be already mapped to a kw transaction at this point.
  try {
    const existingTransaction = await MongooseTransactionModel.findOne({
      $or: [
        { $and: [{ 'integrations.marqeta.token': { $exists: true } }, { 'integrations.marqeta.token': token }] },
        {
          $and: [
            { 'integrations.marqeta.preceding_related_transaction_token': { $exists: true } },
            { 'integrations.marqeta.preceding_related_transaction_token': token },
          ],
        },
        {
          $and: [
            { 'integrations.marqeta.relatedTransactions.token': { $exists: true } },
            { 'integrations.marqeta.relatedTransactions.token': token },
          ],
        },
      ],
    });
    if (existingTransaction?.integrations?.marqeta) return existingTransaction;
  } catch (err) {
    console.log(`Error looking up transaction with marqeta token: ${token}}`);
    console.log(err);
    return null;
  }

  const existingProcessingTransaction = procesingTransactions?.find((t) => t?.integrations?.marqeta?.token === token);
  if (existingProcessingTransaction?.integrations?.marqeta) return existingProcessingTransaction;

  console.log(`No transaction found with marqeta token: ${token}`);
  return null;
};

// Mappings were worked on on the google doc:
// https://docs.google.com/document/d/1IxIzh-6Bn_wFa7zoNKOQVbTqNbmR6KB78eaXzOM4fdM/edit
const getTransactionTypeFromMarqetaTransactionType = (
  marqetaTransactionType: TransactionModelTypeEnumValues,
): TransactionTypeEnumValues | undefined => {
  console.log('/////// this is the type', marqetaTransactionType);
  if (!!Object.values(DepositTransactionTypeEnum).find((t) => t === marqetaTransactionType)) {
    return TransactionTypeEnum.Deposit;
  }
  if (!!Object.values(DebitTransactionTypeEnum).find((t) => t === marqetaTransactionType)) {
    return TransactionTypeEnum.Debit;
  }
  if (!!Object.values(CreditTransactionTypeEnum).find((t) => t === marqetaTransactionType)) {
    console.log('///// this is a credit');
    return TransactionTypeEnum.Credit;
  }
  if (!!Object.values(AdjustmentTransactionTypeEnum).find((t) => t === marqetaTransactionType)) {
    return TransactionTypeEnum.Adjustment;
  }
  return undefined;
};

const getUpdatedTransactionStatusFromRelatedTransactionType = (
  type: TransactionModelTypeEnumValues,
  state: TransactionModelStateEnumValues,
): TransactionModelStateEnumValues => {
  if (!!Object.values(TransactionModelStateEnum).includes(state)) {
    return state;
  }

  if (!!Object.values(TriggerClearedTransactionTypeEnum).find((t) => t === type)) {
    return TransactionModelStateEnum.Completion;
  }
  if (!!Object.values(TriggerPendingTransactionTypeEnum).find((t) => t === type)) {
    return TransactionModelStateEnum.Pending;
  }
  if (!!Object.values(TriggerDeclinedTransactionTypeEnum).find((t) => t === type)) {
    return TransactionModelStateEnum.Declined;
  }
  return undefined; // return TransactionModelStateEnum.Error instead?
};

export const getSubTypeFromMarqetaGPATag = (tag: string): TransactionCreditSubtypeEnumValues => {
  if (tag === TransactionCreditSubtypeEnum.Employer) {
    return TransactionCreditSubtypeEnum.Employer;
  }
  if (tag === TransactionCreditSubtypeEnum.Cashback) {
    return TransactionCreditSubtypeEnum.Cashback;
  }
  return undefined;
};

export const getTagsDataFromMarqetaGPAOrder = (
  tags: string,
): IMarqetaGPACustomTags => {
  const splitTags = tags.split(',');
  const type = splitTags.find((tag) => tag.includes('type'));
  const groupId = splitTags.find((tag) => tag.includes('groupId'));
  const subType = getSubTypeFromMarqetaGPATag(type.split('=')[1]);
  const tagsData: IMarqetaGPACustomTags = {
    type: subType,
  };

  if (!!groupId) {
    // eslint-disable-next-line prefer-destructuring
    tagsData.groupId = groupId.split('=')[1];
  }

  return tagsData;
};

const getSubtypeAndTypeFromMarqetaTransaction = (
  t: TransactionModel,
): { subType?: TransactionSubtypeEnumValues; type?: TransactionTypeEnumValues } => {
  const type = getTransactionTypeFromMarqetaTransactionType(t.type);
  const isRefund = !!Object.values(RefundTransactionTypeEnum).find((tr) => tr === t.type);
  const isGPAOrderWithTags = t.type === TransactionModelTypeEnum.GpaCredit && !!t.gpa_order.tags;
  const isGPAOrderWithoutTags = t.type === TransactionModelTypeEnum.GpaCredit && !t.gpa_order.tags;

  if (isRefund) {
    return { subType: TransactionCreditSubtypeEnum.Refund, type };
  }

  if (isGPAOrderWithTags) {
    // seperate the coma seperated tags
    const tagsData = getTagsDataFromMarqetaGPAOrder(t.gpa_order.tags);
    return { subType: tagsData.type, type };
  }
  // this is a catch for now since we don't have tags on all of our gpa order transactions
  if (isGPAOrderWithoutTags) {
    return { subType: TransactionCreditSubtypeEnum.Cashback, type };
  }

  if (type !== TransactionTypeEnum.Credit) {
    // we only have subtypes for credit transactions right now
    return { subType: undefined, type };
  }
};

const toDate = (date: string): Date | null => {
  if (!date) return null;
  try {
    return new Date(date);
  } catch (err) {
    console.log(`Couldn't parse date: ${date}`);
    return null;
  }
};

const getDateFromMarqetaTransaction = (marqetaTransaction: TransactionModel): Date | null => toDate(marqetaTransaction?.user_transaction_time)
  || toDate(marqetaTransaction?.local_transaction_date)
  || toDate(marqetaTransaction?.created_time)
  || null;

const getNewOrUpdatedTransactionFromMarqetaTransaction = async (
  t: EnrichedMarqetaTransaction,
  processingTransactions: ITransactionDocument[] = [],
): Promise<ITransactionDocument> => {
  // check if this transaction already exists in the db
  const lookupToken = t?.marqeta_transaction?.preceding_related_transaction_token || t?.marqeta_transaction?.token;
  const existingTransaction = await getExistingTransactionFromMarqetaTransactionToken(lookupToken, processingTransactions);
  console.log('existingTransaction', JSON.stringify(existingTransaction));
  if (!!existingTransaction) {
    const hasPrecedingRelatedTransactionToken = !!t?.marqeta_transaction?.preceding_related_transaction_token;
    if (hasPrecedingRelatedTransactionToken) {
      const updatedStatus = getUpdatedTransactionStatusFromRelatedTransactionType(t.marqeta_transaction.type, t.marqeta_transaction?.state);

      let relatedTransactions = existingTransaction?.integrations?.marqeta?.relatedTransactions;
      const currentTransactionIsInRelatedTransactions = !!relatedTransactions?.find(
        (relatedTransaction) => relatedTransaction.token === t.marqeta_transaction.token,
      );
      if (!currentTransactionIsInRelatedTransactions) {
        relatedTransactions = !!relatedTransactions ? [...relatedTransactions, t.marqeta_transaction] : [t.marqeta_transaction];
      }

      existingTransaction.integrations.marqeta = {
        ...existingTransaction.integrations.marqeta,
        relatedTransactions,
      };
      existingTransaction.status = updatedStatus || existingTransaction.status;
    } else {
      existingTransaction.integrations.marqeta = t.marqeta_transaction;
      existingTransaction.status = t.marqeta_transaction.state;
    }
    existingTransaction.amount = t.amount;
    existingTransaction.lastModified = dayjs().utc().toDate();

    if (!!t.marqeta_transaction.settlement_date) {
      if (!!Object.values(TriggerClearedTransactionTypeEnum).find((tr) => tr === t.marqeta_transaction.type)) {
        const settledDate = dayjs(t.marqeta_transaction.settlement_date).utc().toDate();
        existingTransaction.settledDate = settledDate;
        existingTransaction.sortableDate = settledDate;
      }
    } else if (t.marqeta_transaction.type === TransactionModelTypeEnum.GpaCredit) {
      // gpa transactions are always cleared on the same day
      existingTransaction.settledDate = existingTransaction.date;
      existingTransaction.sortableDate = existingTransaction.date;
    } else if (t.marqeta_transaction.type === TransactionModelTypeEnum.AchPull) {
      const settledDate = dayjs(t.marqeta_transaction.created_time).utc().toDate();
      existingTransaction.sortableDate = settledDate;
      existingTransaction.settledDate = settledDate;
    } else {
      existingTransaction.sortableDate = existingTransaction.date;
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
      $or: [
        { 'integrations.marqeta.token': t?.marqeta_transaction?.card_token },
        { 'integrations.marqeta.card_token': t?.marqeta_transaction?.card_token },
      ],
    });
    if (!card?._id) {
      throw Error(`No card found associated with the marqeta card token :${t?.marqeta_transaction?.card_token}`);
    }
    newTransaction.card = card;
  } catch (err) {
    console.error(err);
    throw new CustomError(`Error looking up the card associated with this transaction: ${JSON.stringify(t)} `, ErrorTypes.SERVER);
  }

  const types = getSubtypeAndTypeFromMarqetaTransaction(t.marqeta_transaction);
  const date = getDateFromMarqetaTransaction(t.marqeta_transaction);
  newTransaction.amount = t?.amount;
  newTransaction.status = t.marqeta_transaction?.state;
  newTransaction.integrations = { marqeta: t.marqeta_transaction };
  newTransaction.type = types?.type;
  newTransaction.subType = types?.subType;
  newTransaction.date = date;

  if (!!t.marqeta_transaction.settlement_date && !!Object.values(TriggerClearedTransactionTypeEnum).find((tr) => tr === t.marqeta_transaction.type)) {
    // settled date added to the og transaction
    const settledDate = dayjs(t.marqeta_transaction.settlement_date).utc().toDate();
    newTransaction.settledDate = settledDate;
    newTransaction.sortableDate = settledDate;
  } else if (t.marqeta_transaction.type === TransactionModelTypeEnum.GpaCredit) {
    // gpa transactions are always cleared on the same day
    newTransaction.settledDate = date;
    newTransaction.sortableDate = date;
  } else {
    // pending transaction
    newTransaction.sortableDate = date;
  }

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

  // filter out any that couldn't map to a plaid transaction
  const transactionsWithNoNameOrMerchantName: EnrichedMarqetaTransaction[] = [];
  const mappedWithCompanyName = mapped.filter((t) => {
    if (!t.name && !t.merchant_name) {
      transactionsWithNoNameOrMerchantName.push(t);
      return false;
    }
    return true;
  });

  let { matched, notMatched } = await matchTransactionCompanies(mappedWithCompanyName, saveMatches);
  notMatched = [...notMatched, ...transactionsWithNoNameOrMerchantName];

  ({ matched, notMatched } = await matchTransactionsToCompaniesByMCC(
    matched as (EnrichedMarqetaTransaction & { company: ObjectId })[],
    notMatched as EnrichedMarqetaTransaction[],
  ));

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

export const getTransactions = async (queryParams: GetPaginiatedResourceParams): Promise<PaginatedMarqetaResponse<TransactionModel[]>> => {
  const transactions = await transactionsClient.listTransaction(queryParams);
  return transactions;
};

export const getPaginatedTransactionsForUser = async (userId: string): Promise<TransactionModel[]> => {
  const userDoc = await UserModel.findById(userId);
  const { userToken } = userDoc.integrations.marqeta;
  const transactions = await getMarqetaResources({ userToken, sortBy: 'created_time' }, getTransactions);
  return transactions;
};
