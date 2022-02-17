import { Job } from 'bullmq';

interface IPlaidTransactionMapperResult {
  dummy: any;
}

export const exec = (job: Job) => {
  // get user access tokens
  // pass those to plaid integration mapper.
  console.log(job);
};

export const onComplete = async (job: Job, result: IPlaidTransactionMapperResult) => {
  // do stuff
  console.log(job, result);
};
