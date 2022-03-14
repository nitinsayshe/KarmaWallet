import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { CardModel } from '../src/models/card';
import { Logger } from '../src/services/logger';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: {},
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();

    // add mappers here...
    const cards = await CardModel.find({ 'integrations.plaid.accessToken': { $in: ['access-production-b96e8863-975e-4bb5-b632-2f281cfcd806'] } });
    console.log('>>>>> cards');
    console.log(cards);

    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
  }
})();
