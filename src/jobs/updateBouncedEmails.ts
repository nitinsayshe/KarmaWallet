import { SandboxedJob } from 'bullmq';

import { AwsClient } from '../clients/aws';
import { JobNames } from '../lib/constants/jobScheduler';

export const exec = async () => {
  const awsClient = new AwsClient();
  const suppressionList = await awsClient.getSuppressedDestinations();
  for (const item of suppressionList) {
    console.log(item.EmailAddress, item.LastUpdateTime, item.Reason);
  }
  return suppressionList;
};

export const onComplete = async (_: SandboxedJob, result: any) => {
  console.log(`${JobNames.UpdateBouncedEmails} finished: \n ${JSON.stringify(result)}`);
};
