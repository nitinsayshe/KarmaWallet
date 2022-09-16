/* eslint-disable camelcase */
import 'dotenv/config';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { getPrevPayoutDate } from '../src/services/commission';
import { getUtcDate } from '../src/lib/date';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: { },
    //   authKey: '',
    // } as IRequest);
    // await MongoClient.init();
    // updateCompaniesUrls();
    // add mappers here...
    // await associateWildfireMatches();
    // await GenerateGroupStatements.exec();
    // await removeMerchant('63079ac5e33a266250fb7ce4');
    // await removeDuplicateWildfireMerchants();
    const prevPayout = getPrevPayoutDate(getUtcDate(new Date('2022-12-01')).toDate());
    console.log(prevPayout);
    // await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    // await MongoClient.disconnect();
  }
})();
