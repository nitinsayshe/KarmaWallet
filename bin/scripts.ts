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
import { getEvaluatedUNSDGsCountForCompanies } from '../src/services/scripts/generate_evaluated_UNSDGs_by_company';

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

    await getEvaluatedUNSDGsCountForCompanies('621b99375f87e75f5365a661');
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    console.log(err);
    // await MongoClient.disconnect();
  }
})();
