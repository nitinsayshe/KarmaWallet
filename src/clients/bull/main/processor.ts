import { SandboxedJob } from 'bullmq';
import { mockRequest } from '../../../lib/constants/request';
import * as PlaidIntegration from '../../../integrations/plaid';
import * as UserPlaidTransactionMapper from '../../../jobs/userPlaidTransactionMap';

export const mainBullClientProcessor = async (job: SandboxedJob) => {
  // global plaid transaction mapping
  // ind. user linked card plaid transaction mapping
  // sending email (multiple kinds and types)
  // user impact score calculation (run this after global plaid transactions)
  // run reports calc (users report)
  switch (job.name) {
    case 'global-plaid-transaction-mapper':
      await PlaidIntegration.mapTransactionsFromPlaid(mockRequest);
      break;
    case 'user-plaid-transaction-mapper':
      UserPlaidTransactionMapper.exec(job);
      break;
    default:
      console.log('>>>>> invalid job name found');
      break;
  }
};
