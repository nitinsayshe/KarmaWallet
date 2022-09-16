/* eslint-disable camelcase */
import 'dotenv/config';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { WildfireClient } from '../src/clients/wildfire';
import { mapWildfireCommissionToKarmaCommission } from '../src/services/commission/utils';
import { MongoClient } from '../src/clients/mongo';

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
    const wildfireClient = new WildfireClient();
    const res = await wildfireClient.getAdminComissionDetails({ startDate: '2022-07-01', endDate: '2022-09-15' });

    for (const commission of res.data.Commissions) {
      await mapWildfireCommissionToKarmaCommission({ ...commission, TC: '62f6761cf5e3ffdae60ef249' });
    }

    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
