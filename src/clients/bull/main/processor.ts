import { SandboxedJob } from 'bullmq';
import { JobNames } from '../../../lib/constants/jobScheduler';
import { mockRequest } from '../../../lib/constants/request';
import * as PlaidIntegration from '../../../integrations/plaid';
import * as UserPlaidTransactionMapper from '../../../jobs/userPlaidTransactionMap';
import * as SendEmail from '../../../jobs/sendEmail';
import { _MongoClient } from '../../mongo';
import * as AnalyzeTransactions from '../../../jobs/analyzeTransactions';

const MongoClient = new _MongoClient();

// Sandboxed processors must be exported as default to run correctly
// See line 25: node_modules/bullmq/dist/cjs/classes/child-processor.js
export default async (job: SandboxedJob) => {
  // global plaid transaction mapping
  // ind. user linked card plaid transaction mapping
  // sending email (multiple kinds and types)
  // user impact score calculation (run this after global plaid transactions)
  // run reports calc (users report)
  const { name, data } = job;
  let result: any;
  await MongoClient.init();
  switch (name) {
    case JobNames.AnalyzeTransactions:
      result = AnalyzeTransactions.exec();
      break;
    case JobNames.GlobalPlaidTransactionMapper:
      result = await PlaidIntegration.mapTransactionsFromPlaid(mockRequest);
      break;
    case JobNames.SendEmail:
      result = await SendEmail.exec(data);
      break;
    case JobNames.UserPlaidTransactionMapper:
      result = await UserPlaidTransactionMapper.exec(data);
      break;
    default:
      console.log('>>>>> invalid job name found');
      break;
  }
  return result;
};
