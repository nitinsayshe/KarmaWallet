import { SandboxedJob } from 'bullmq';
import { JobNames } from '../../../lib/constants/jobScheduler';
import { _MongoClient } from '../../mongo';
import * as SendEmail from '../../../jobs/sendEmail';
import * as UpdateBouncedEmails from '../../../jobs/updateBouncedEmails';

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
    case JobNames.SendEmail:
      result = await SendEmail.exec(data);
      break;
    case JobNames.UpdateBouncedEmails:
      result = await UpdateBouncedEmails.exec();
      break;
    default:
      console.log('>>>>> invalid job name found: ', name);
      break;
  }
  return result;
};
