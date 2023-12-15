import { Transaction } from 'plaid';
import { TransactionModel } from '../clients/marqeta/types';

export type CombinedPartialTransaction = Partial<Transaction> & Partial<TransactionModel> & { name: string; };
