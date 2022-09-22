/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import 'dotenv/config';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { WildfireClient } from '../src/clients/wildfire';
import { mapWildfireCommissionToKarmaCommission } from '../src/services/commission/utils';
import { MongoClient } from '../src/clients/mongo';
import { CommissionModel } from '../src/models/commissions';

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
    const commissions = await CommissionModel.find({});
    for (const commission of commissions) {
      console.log(`\nUpdating commission ${commission._id}`);
      const { amount, allocation } = commission;
      console.log({ amount, user: allocation.user, karma: allocation.karma });
      const newUserAllocation = Math.floor((amount * 0.75) * 100) / 100;
      const newKarmaAllocation = amount - newUserAllocation;
      console.log({ newUserAllocation, newKarmaAllocation });
      const totalAllocation = newUserAllocation + newKarmaAllocation;
      console.log('total allocation', totalAllocation);
      console.log('is equal or less than amount?', totalAllocation <= amount);
      commission.allocation.user = newUserAllocation;
      commission.allocation.karma = newKarmaAllocation;
      await commission.save();
    }
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
