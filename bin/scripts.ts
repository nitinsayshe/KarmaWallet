/* eslint-disable camelcase */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import * as GenerateGroupStatements from '../src/jobs/generateGroupStatements';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: { },
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();
    // updateCompaniesUrls();
    // add mappers here...
    await GenerateGroupStatements.exec();
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
