import { SandboxedJob } from 'bullmq';

interface IPlaidTransactionMapperResult {
  dummy: any;
}

export const exec = (job: SandboxedJob) => {
  // get user access tokens
  // pass those to plaid integration mapper.
  console.log(job);
};

export const onComplete = async (job: SandboxedJob, result: IPlaidTransactionMapperResult) => {
  // do stuff
  console.log(job, result);
};
