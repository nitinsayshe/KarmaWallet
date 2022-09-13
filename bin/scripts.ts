/* eslint-disable camelcase */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { PaypalClient } from '../src/clients/paypal';

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
    const paypalClient = new PaypalClient();
    const data = await paypalClient.getCustomerDataFromToken('A21AAIUzVUYq76GwDTVfaC-N-PZpz92mPGGG2hTyhE4n6FNE4i8LUyxXRMsjqahpn9aR-9YElCrAJjhkQpcCisinFckXGThig');
    console.log(data);
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
