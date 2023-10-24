import fs from 'fs';
import path from 'path';
import { TransactionModel } from '../../clients/marqeta/types';
import { listTransaction } from '../../integrations/marqeta/transactions';
import { sleep } from '../../lib/misc';
import { IRequest } from '../../types/request';

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
