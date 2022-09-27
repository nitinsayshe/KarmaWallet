/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { manuallyUpdateTransactionsFalsePositiveNegatives } from '../src/services/scripts/update_false_positive_negatives_transactions';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: { },
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();
    // updateCompaniesUrls();
    // add mappers here...
    // await associateWildfireMatches();
    // await GenerateGroupStatements.exec();
    // await removeMerchant('63079ac5e33a266250fb7ce4');
    // await removeDuplicateWildfireMerchants();
    await manuallyUpdateTransactionsFalsePositiveNegatives();

    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
