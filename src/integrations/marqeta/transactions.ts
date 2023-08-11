import { Transactions } from '../../clients/marqeta/transactions';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';
import { IMarqetaMakeTransaction, IMarqetaMakeTransactionAdvice, IMarqetaMakeTransactionClearing } from './types';

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

export const listTransaction = async (req: IRequest<{}, { userToken: string, cardToken:string }, {}>) => {
  const params = req.query;
  const userResponse = await transactions.listTransaction(params);
  return { data: userResponse };
};
