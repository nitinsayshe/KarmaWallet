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
import { getCurrentWildfireData, pullRecentFromDatabaseAndSave, associateWildfireMatches } from '../src/services/scripts/wildfire';
import { findCompaniesWithDupeSectorsAndClear } from '../src/services/scripts/findAndRemoveDupeSectors';

dayjs.extend(utc);

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: { },
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();
    await findCompaniesWithDupeSectorsAndClear();
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    console.log(err);
    // await MongoClient.disconnect();
  }
})();
