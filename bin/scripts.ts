/* eslint-disable camelcase */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { WildfireClient } from '../src/clients/wildfire';

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
    const client = new WildfireClient();
    const device = await client.adminCreateDevice();
    console.log(device);
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
