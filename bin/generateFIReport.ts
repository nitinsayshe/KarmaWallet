/* WARNING: This consumes a ton of memory! */
/* Allows node to use ~16GB of memory */
/* node --max_old_space_size=16384 --require ts-node/register -r dotenv/config generateFIReport.ts */
import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { generateFIUserReport, generateFIReport } from '../src/services/scripts/generate_financial_institution_report';

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
