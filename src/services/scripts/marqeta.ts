import fs from 'fs';
import path from 'path';
import { TransactionModel } from '../../clients/marqeta/types';
import { listTransaction, mapAndSaveMarqetaTransactionsToKarmaTransactions } from '../../integrations/marqeta/transactions';
import { sleep } from '../../lib/misc';
import { IRequest } from '../../types/request';
import { UserModel } from '../../models/user';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { Transactions } from '../../clients/marqeta/transactions';

export const getMarqetaTransactions = async () => {
  let transactions: TransactionModel[] = [];
  let moreTransactions = true;
  let startIndex = 0;
  while (moreTransactions) {
    console.log(`getting start index: ${startIndex}`);
    const mockRequest = {
      requestor: {},
      authKey: '',
      query: {
        type: '',
        startIndex,
      },
    } as IRequest<{}, { userToken: string; cardToken: string; startIndex: number; type: string }, {}>;
    try {
      const transactionsBatch = await listTransaction(mockRequest);
      moreTransactions = transactionsBatch.data.is_more;
      startIndex = transactionsBatch.data.end_index + 1;
      transactions = [...transactions, ...transactionsBatch.data.data];
      console.log(`batch: ${transactionsBatch.data.data.length}`);
      console.log(`total: ${transactions.length}`);
    } catch (err) {
      console.log(err);
      moreTransactions = false;
    }
    sleep(1000);
  }

  fs.writeFileSync(path.resolve(__dirname, './.tmp/marqeta-transactions.json'), JSON.stringify(transactions));
};

export const getTransactionsForUser = async (userId: string) => {
  const user = await UserModel.findById(userId);
  const { userToken } = user.integrations.marqeta;
  const marqetaClient = await new MarqetaClient();
  const transactionClient = await new Transactions(marqetaClient);
  const transactions = await transactionClient.listTransactionsForUser(userToken);
  console.log('/////// Transactions for user', transactions);
  const mappedTransactions = await mapAndSaveMarqetaTransactionsToKarmaTransactions(transactions);
  console.log('//////// Mapped transactions', mappedTransactions);
};
