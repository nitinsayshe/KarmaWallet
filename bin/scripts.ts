/* eslint-disable camelcase */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import * as DeleteUserAndAssociatedData from '../src/jobs/deleteUserAndAssociatedData';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: { },
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();
    // updateCompaniesUrls();
    // add mappers here...
    await DeleteUserAndAssociatedData.exec({ userId: '630aae7a41090cabb3257428' });
    await MongoClient.disconnect();
  } catch (err) {
    console.log(err);
    await MongoClient.disconnect();
  }
})();
