import { SandboxedJob } from 'bullmq';
import { JobNames } from '../../../lib/constants/jobScheduler';
import { _MongoClient } from '../../mongo';
import * as SendEmail from '../../../jobs/sendEmail';
import * as UpdateBouncedEmails from '../../../jobs/updateBouncedEmails';
import * as SendWelcomeFlowEmails from '../../../jobs/sendWelcomeFlowEmails';

const MongoClient = new _MongoClient();

// Sandboxed processors must be exported as default to run correctly
// See line 25: node_modules/bullmq/dist/cjs/classes/child-processor.js
export default async (job: SandboxedJob) => {
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
    case JobNames.SendWelcomeFlowEmails:
      result = await SendWelcomeFlowEmails.exec();
      break;
    default:
      console.log('>>>>> invalid job name found: ', name);
      break;
  }
  return result;
};
