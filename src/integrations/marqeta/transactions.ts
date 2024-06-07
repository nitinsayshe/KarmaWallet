/* eslint-disable no-restricted-syntax */
import dayjs from 'dayjs';
import { parseInt } from 'lodash';
import { Transaction } from 'plaid';
import { ObjectId } from 'mongoose';
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
  WithdrawalTransactionTypeEnum,
} from '../../lib/constants/transaction';
import CustomError from '../../lib/customError';
import { saveDocuments } from '../../lib/model';
import { CardModel } from '../../models/card';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { ISectorDocument, SectorModel } from '../../models/sector';
import { ITransaction, ITransactionDocument, TransactionModel as MongooseTransactionModel } from '../../models/transaction';
import { UserModel } from '../../models/user';
import { IRef } from '../../types/model';
import { IRequest } from '../../types/request';
import { IMatchedTransaction } from '../plaid/types';
import {
  EnrichedMarqetaTransaction,
  IMarqetaMakeTransaction,
  IMarqetaMakeTransactionAdvice,
  IMarqetaMakeTransactionClearing,
  ListTransactionsResponse,
  MCCStandards,
  PaginatedMarqetaResponse,
} from './types';
import { IMarqetaGPACustomTags } from '../../services/transaction/types';
import { GroupModel } from '../../models/group';
import { ACHTransferModel } from '../../models/achTransfer';
import { createEmployerGiftEmailUserNotification, createPushUserNotificationFromUserAndPushData } from '../../services/user_notification';
import { PushNotificationTypes } from '../../lib/constants/notification';
import { matchTransactionCompanies } from '../../services/transaction';

export interface IMarqetaTokenTransactionDictionary {
  [key: string]: ITransactionDocument;
}

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
  if (!!Object.values(WithdrawalTransactionTypeEnum).find((t) => t === marqetaTransactionType)) {
    return TransactionTypeEnum.Withdrawal;
  }
  return undefined;
};

const getUpdatedTransactionStatusFromRelatedTransactionType = (
  type: TransactionModelTypeEnumValues,
  state: TransactionModelStateEnumValues,
): TransactionModelStateEnumValues => {
  if (!!Object.values(TriggerClearedTransactionTypeEnum).find((t) => t === type)) {
    return TransactionModelStateEnum.Completion;
  }
  if (!!Object.values(TriggerPendingTransactionTypeEnum).find((t) => t === type)) {
    return TransactionModelStateEnum.Pending;
  }
  if (!!Object.values(TriggerDeclinedTransactionTypeEnum).find((t) => t === type)) {
    return TransactionModelStateEnum.Declined;
  }

  if (!!Object.values(TransactionModelStateEnum).includes(state)) {
    return state;
  }

  return TransactionModelStateEnum.Error; // return TransactionModelStateEnum.Error instead?
};

export const getSubTypeFromMarqetaGPATag = (tag: string): TransactionCreditSubtypeEnumValues => {
  if (tag === TransactionCreditSubtypeEnum.Employer) {
    return TransactionCreditSubtypeEnum.Employer;
  }
  if (tag === TransactionCreditSubtypeEnum.Cashback) {
    return TransactionCreditSubtypeEnum.Cashback;
  }
  if (tag === TransactionCreditSubtypeEnum.ProgramCredit) {
    return TransactionCreditSubtypeEnum.ProgramCredit;
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
    const updatedStatus = getUpdatedTransactionStatusFromRelatedTransactionType(t.marqeta_transaction.type, t.marqeta_transaction?.state);
    if (hasPrecedingRelatedTransactionToken) {
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
    } else {
      existingTransaction.integrations.marqeta = t.marqeta_transaction;
    }
    existingTransaction.status = updatedStatus || existingTransaction?.status;
    existingTransaction.amount = t.amount;
    existingTransaction.lastModified = dayjs().utc().toDate();

    // set settled date
    if (!!t.marqeta_transaction.settlement_date) {
      if (!!Object.values(TriggerClearedTransactionTypeEnum).find((tr) => tr === t.marqeta_transaction.type)) {
        const settledDate = dayjs(t.marqeta_transaction.created_time).utc().toDate();
        existingTransaction.settledDate = settledDate;
        existingTransaction.sortableDate = settledDate;
      }
    } else if (t.marqeta_transaction.type === TransactionModelTypeEnum.GpaCredit) {
      // gpa transactions are always cleared on the same day
      existingTransaction.settledDate = existingTransaction.date;
      existingTransaction.sortableDate = existingTransaction.date;
    } else if (t.marqeta_transaction.type === TransactionModelTypeEnum.AchPull || t.marqeta_transaction.type === TransactionModelTypeEnum.AchPush || t.marqeta_transaction.type === TransactionModelTypeEnum.DirectdepositCredit || t.marqeta_transaction.type === TransactionModelTypeEnum.DirectdepositDebit) {
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

  if (!!t.marqeta_transaction?.bank_transfer_token) {
    // add achTransfer if it applies
    const achTransfer = await ACHTransferModel.findOne({
      token: t.marqeta_transaction.bank_transfer_token,
    });

    if (!!achTransfer?.bank) newTransaction.achTransfer = achTransfer;
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
    const settledDate = dayjs(t.marqeta_transaction.created_time).utc().toDate();
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

  if (types.subType === TransactionCreditSubtypeEnum.Employer) {
    console.log('////// EMPLOYER GIFT TRANSACTION');
    const tagsData = getTagsDataFromMarqetaGPAOrder(t.marqeta_transaction.gpa_order.tags);
    const group = await GroupModel.findOne({ _id: tagsData.groupId });
    if (!group._id) {
      throw new Error(`No group found with id ${tagsData.groupId}`);
    }
    newTransaction.group = group as any;
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

export const updateMarqetaTransactions = async (
  allUserTransactions: ITransaction[],
  newlyMatchedTransactions: IMatchedTransaction[],
) => {
  const logId = '[updt] - ';
  const log = (message: string) => console.log(`${logId}${message}`);

  log('updating transactions');
  log(`transaction count: ${allUserTransactions.length}`);
  log(`remaining transaction count: ${newlyMatchedTransactions.length}`);

  const transactionsToSave: any = [];

  const marqetaTokenDictionary: IMarqetaTokenTransactionDictionary = allUserTransactions.reduce(
    (acc: { [key: string]: ITransactionDocument }, t) => {
      if (!t.integrations?.marqeta?.token) return acc;
      acc[t.integrations.marqeta.token] = t as ITransactionDocument;
      return acc;
    },
    {},
  );

  const timeString = `${logId}transactions comparison`;
  console.time(timeString);

  for (const newlyMatchedTransaction of newlyMatchedTransactions) {
    const transaction = marqetaTokenDictionary[newlyMatchedTransaction.token];
    if (!transaction) continue;
    transaction.integrations.marqeta = newlyMatchedTransaction;
    if (
      transaction.company?.toString() === newlyMatchedTransaction.company?.toString()
      || (!transaction.company && !newlyMatchedTransaction.company)
    ) {
      continue;
    }
    log(
      `updating transaction ${transaction._id} company from ${transaction.company} to ${newlyMatchedTransaction.company}`,
    );

    const update: any = {
      _id: transaction._id,
    };

    if (newlyMatchedTransaction.company) update.company = newlyMatchedTransaction.company;
    else update.$unset = { company: '' };
    transactionsToSave.push(MongooseTransactionModel.updateOne({ _id: transaction._id }, update));
  }

  log(`transactions to save count: ${transactionsToSave.length}`);
  await Promise.all(transactionsToSave);
  console.timeEnd(timeString);
};

// This is a placeholder for adding logic that handles the dispute macros
export const handleTransactionDisputeMacros = async (transactions: ITransactionDocument[]): Promise<void> => {
  await Promise.all(
    transactions.map(async (c) => {
      try {
        switch (c?.integrations?.marqeta?.type) {
          case AdjustmentTransactionTypeEnum.AuthorizationClearingChargebackProvisionalCredit:
            // call function
            break;
          case AdjustmentTransactionTypeEnum.PindebitChargebackProvisionalCredit:
            // call function
            break;
          default:
            console.log(`No notification created for transaction with type: ${c?.integrations?.marqeta?.type}`);
        }
      } catch (err) {
        console.error(`Error creating notification from transaction transition: ${JSON.stringify(c)}`);
        console.error(err);
        return null;
      }
    }),
  );
};

export const handleCreditNotification = async (transaction: ITransactionDocument) => {
  if (transaction.status !== TransactionModelStateEnum.Completion) return;
  const user = await UserModel.findById(transaction.user);
  // This is a reversal do not send a notification
  if (!!transaction?.integrations?.marqeta?.relatedTransactions && transaction.integrations.marqeta.relatedTransactions.length) return;
  if (transaction.subType === TransactionCreditSubtypeEnum.Employer) {
    // add notifiction here?
    await createPushUserNotificationFromUserAndPushData(user, {
      pushNotificationType: PushNotificationTypes.EMPLOYER_GIFT,
      body: `An employer gift of $${transaction?.amount.toFixed(2)} has been deposited onto your Karma Wallet Card`,
      title: 'Employer Gift Received!',
    });

    await createEmployerGiftEmailUserNotification(user, transaction);
  }
};

const _sendTransactionNotifications = (transaction: ITransactionDocument) => {
  // advice is an adjustment to an existing transaction, no need to send a notification even though it will be in a pending state
  if (transaction.integrations.marqeta.type === 'authorization.advice') return false;
  if (transaction.status === TransactionModelStateEnum.Pending) return true;
  if (transaction.status === TransactionModelStateEnum.Completion && !transaction?.integrations?.marqeta?.relatedTransactions) return true;
  return false;
};

export const handleDebitNotification = async (transaction: ITransactionDocument) => {
  const user = await UserModel.findById(transaction.user);
  const merchantName = transaction?.integrations?.marqeta?.card_acceptor?.name;
  const mccCode = transaction?.integrations?.marqeta?.card_acceptor?.mcc;

  // send notification when initial transaction is initiated (usually starts in pending state, sometimes starts in completion state)
  if (_sendTransactionNotifications(transaction)) {
    // any notification
    await createPushUserNotificationFromUserAndPushData(user, {
      pushNotificationType: PushNotificationTypes.TRANSACTION_COMPLETE,
      title: 'Transaction Alert',
      body: `New transaction from ${merchantName}`,
    });

    // Dining out notification
    if (MCCStandards.DINING.includes(mccCode)) {
      await createPushUserNotificationFromUserAndPushData(user, {
        pushNotificationType: PushNotificationTypes.TRANSACTION_OF_DINING,
        title: 'Donation Alert!',
        body: 'You dined out. We donated to hunger alleviation!',
      });
    }

    // Gas notification
    if (MCCStandards.GAS.includes(mccCode)) {
      await createPushUserNotificationFromUserAndPushData(user, {
        pushNotificationType: PushNotificationTypes.TRANSACTION_OF_GAS,
        title: 'Donation Alert!',
        body: 'You bought gas. We donated to reforestation.',
      });
    }
  }
};

export const handleTransactionNotifications = async (transactions: ITransactionDocument[]): Promise<void> => {
  await Promise.all(
    transactions.map(async (t) => {
      try {
        switch (t.type) {
          case TransactionTypeEnum.Credit:
            handleCreditNotification(t);
            break;
          case TransactionTypeEnum.Debit:
            handleDebitNotification(t);
            break;
          case TransactionTypeEnum.Deposit:
            // add code as needed
            break;
          case TransactionTypeEnum.Adjustment:
            // add code as needed
            break;
          default:
            console.log(`No notification created for transaction with type: ${t.type}`);
        }
      } catch (err) {
        console.error(`Error creating notification from transaction transition: ${JSON.stringify(t)}`);
        console.error(err);
        return null;
      }
    }),
  );
};
