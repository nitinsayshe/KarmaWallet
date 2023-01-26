/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import 'dotenv/config';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { PromoModel } from '../src/models/promo';
import { CommissionModel, KarmaCommissionStatus } from '../src/models/commissions';
import { MerchantModel } from '../src/models/merchant';

dayjs.extend(utc);

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: { },
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();
    // await PromoModel.create({
    //   name: 'facebook-january-10-dollar-link-bonus',
    //   startDate: dayjs.utc('2021-01-01').toDate(),
    //   endDate: dayjs.utc('2021-01-31').toDate(),
    //   limit: 1,
    //   amount: 10,
    //   enabled: true,
    // });

    await CommissionModel.create({
      name: 'Impact Karma',
      merchant: '63d2b2d148234101740ccdd0',
      company: '62def0e77b212526d1e055ca',
      user: '62f6761cf5e3ffdae60ef249',
      amount: 10,
      status: KarmaCommissionStatus.ConfirmedAndAwaitingVendorPayment,
      allocation: {
        user: 10,
        karma: 0,
      },
      integrations: {
        karma: {
          amount: 10,
          promo: '63d2ae1a0ff74cb9d95bba55',
        },
      },
    });
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    console.log(err);
    // await MongoClient.disconnect();
  }
})();
