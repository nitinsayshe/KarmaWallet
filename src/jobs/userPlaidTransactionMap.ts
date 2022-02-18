import { SandboxedJob } from 'bullmq';

interface IPlaidTransactionMapperResult {
  dummy: any;
}

interface IUserPlaidTransactionMapParams {
  userId: string,
}

export const exec = (data: IUserPlaidTransactionMapParams) => {
  const { userId } = data;
  // get user access tokens
  // pass those to plaid integration mapper.
  console.log(userId);
};

export const onComplete = async (job: SandboxedJob, result: IPlaidTransactionMapperResult) => {
  // do stuff
  console.log(`${job.name} finished: \n ${JSON.stringify(result)}`);
};
