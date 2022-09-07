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
    const merchantData = await client.getMerchantRates();
    console.log({ merchantData: !!merchantData });
    const couponData = await client.getCoupons();
    console.log({ couponData: !!couponData });
    const activeDomains = await client.getActiveDomains();
    console.log({ activeDomains: !!activeDomains });
    const merchants = await client.getMerchants();
    console.log({ merchants: !!merchants });
    const category = await client.getCategoryData();
    console.log({ category: !!category });
    const featuredMerchant = await client.getFeaturedMerchantData();
    console.log({ featuredMerchant: !!featuredMerchant });
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
