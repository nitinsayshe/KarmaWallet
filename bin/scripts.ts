/* eslint-disable camelcase */
import 'dotenv/config';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { MongoClient } from '../src/clients/mongo';
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
