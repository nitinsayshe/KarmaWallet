/* eslint-disable no-restricted-syntax */
/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { generateMonthlyImpactReportForUser } from '../src/jobs/userMonthlyImpactReports';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import * as UserMonthlyImpactReports from '../src/jobs/userMonthlyImpactReports';

dayjs.extend(utc);

(async () => {
  try {
    await MongoClient.init();
    await UserMonthlyImpactReports.exec({ generateFullHistory: true, uid: '621b99235f87e75f53659b49' });
  } catch (err) {
    console.log(err);
  } finally {
    MongoClient.disconnect();
  }
})();
