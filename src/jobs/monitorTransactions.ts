import { SandboxedJob } from 'bullmq';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { JobNames } from '../lib/constants/jobScheduler';
import { asCustomError } from '../lib/customError';
import { ReportModel } from '../models/report';
import { TransactionModel } from '../models/transaction';

dayjs.extend(utc);

/**
 * a job that will report on all the transactions in the db
 * so we can more easily monitor if anything breaks or is
 * implemented incorrectly.
 */

export const exec = async () => {
  try {
    const transactions = await TransactionModel.find({}).lean();

    let missingSectors = 0;
    let missingCompany = 0;

    for (const transaction of transactions) {
      if (!transaction.sector) missingSectors += 1;
      if (!transaction.company) missingCompany += 1;
    }

    const report = new ReportModel({
      transactionsMonitor: {
        totalTransactions: transactions.length,
        missingSectors,
        missingCompany,
      },
      createdOn: dayjs().utc().toDate(),
    });

    await report.save();
  } catch (err) {
    throw asCustomError(err);
  }
};

export const onComplete = () => {
  console.log(`${JobNames.TransactionsMonitor} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.TransactionsMonitor} failed`);
  console.log(err);
};
