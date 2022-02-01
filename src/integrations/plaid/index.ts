import { JobStatus } from '../../lib/constants';
import { asCustomError } from '../../lib/customError';
import { PlaidItemModel } from '../../models/plaidItem';
import { jobIsActive, updateJobStatus } from '../../services/jobStatus';
import { IRequest } from '../../types/request';
import { PlaidMapper } from './mapper';

export const mapExistingItems = async (_: IRequest) => {
  const jobName = 'existing-plaid-items-mapper';
  try {
    if (await jobIsActive(jobName)) return { inProgress: true };
    await updateJobStatus(jobName, JobStatus.Active);

    console.log('\nstarting process to map existing plaid items...');
    console.log(`timestamp: ${new Date().toString()}\n`);

    console.log('\nretrieving all plaid items...');
    const plaidItems = await PlaidItemModel.find().lean();
    console.log('[+] plaid items retrieved\n');

    const mapper = new PlaidMapper(plaidItems);
    await mapper.mapItems();
    await mapper.mapCategoriesToTransactions();
    await mapper.mapTransactionsToCompanies();
    await mapper.saveTransactions();
    await mapper.saveSummary();
    mapper.printSummary();

    await updateJobStatus(jobName, JobStatus.Inactive);
    console.log('\n[+] process complete');
  } catch (err) {
    await updateJobStatus(jobName, JobStatus.Inactive);
    throw asCustomError(err);
  }
};

export const mapTransactionsFromPlaid = async (_: IRequest, acs: string[] = [], daysInPast = 90) => {
  const jobName = 'plaid-transactions-mapper';

  try {
    if (!acs.length) {
      if (await jobIsActive(jobName)) return { inProgress: true };
      await updateJobStatus(jobName, JobStatus.Active);
    }

    const mapper = new PlaidMapper();
    await mapper.mapTransactionsFromPlaid(acs, daysInPast);

    if (!mapper.transactions.length) {
      if (!acs.length) await updateJobStatus(jobName, JobStatus.Inactive);
      const message = 'no transactions received from plaid';
      console.log(message);
      return { message };
    }

    await mapper.mapCategoriesToTransactions();
    await mapper.mapTransactionsToCompanies();
    await mapper.saveTransactions();
    await mapper.saveSummary();
    mapper.printSummary();

    if (!acs?.length) await updateJobStatus(jobName, JobStatus.Inactive);
  } catch (err: any) {
    if (!acs?.length) await updateJobStatus(jobName, JobStatus.Inactive);
    throw asCustomError(err);
  }
};

// write the collection of mapped categories to our db
// this collection will then be used to map each transaction
// with our categories and carbon multiplier score
export const mapPlaidCategoriesToKarmaCategoriesAndCarbonMultiplier = async (_: IRequest) => {
  const jobName = 'plaid-categories-mapper';

  try {
    if (await jobIsActive(jobName)) return { inProgress: true };
    await updateJobStatus(jobName, JobStatus.Active);

    const mapper = new PlaidMapper();
    await mapper.mapPlaidCategoriesToKarmaCategoriesAndCarbonMultiplier();

    await updateJobStatus(jobName, JobStatus.Inactive);
  } catch (err) {
    await updateJobStatus(jobName, JobStatus.Inactive);
    throw asCustomError(err);
  }
};

export const reset = async (_: IRequest) => {
  const mapper = new PlaidMapper();
  await mapper.reset();
};
