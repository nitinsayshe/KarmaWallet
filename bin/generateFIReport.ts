/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { generateFIUserReport, generateFIReport } from '../src/services/scripts/generate_financial_institution_report';

const email = 'an.dy@theimpactkarma.com';
const userId = '63921faeeab8cdbb11798ad5';
(async () => {
  try {
    await MongoClient.init();
    await generateFIUserReport([]);
    await generateFIReport(true);
  } catch (err) {
    Logger.error(asCustomError(err));
    console.log(err);
  } finally {
    await MongoClient.disconnect();
  }
})();
