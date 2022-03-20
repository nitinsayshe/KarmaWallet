import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../../lib/customError';
import { ReportModel } from '../../models/report';
import { TransactionModel } from '../../models/transaction';

dayjs.extend(utc);

/**
 * a job that will report on all the transactions in the db
 * so we can more easily monitor if anything breaks or is
 * implemented incorrectly.
 */

export const analyzeTransactions = async () => {
  console.log('\nanalyzing transactions...');

  try {
    const transactions = await TransactionModel.find({}).lean();

    let missingCarbonMultipiers = 0;
    let missingCompany = 0;

    for (const transaction of transactions) {
      if (!transaction.carbonMultiplier) missingCarbonMultipiers += 1;
      if (!transaction.companyId) missingCompany += 1;
    }

    const report = new ReportModel({
      transactionAnalysis: {
        totalTransactions: transactions.length,
        missingCarbonMultipiers,
        missingCompany,
      },
      createdOn: dayjs().utc().toDate(),
    });

    await report.save();
  } catch (err) {
    throw asCustomError(err);
  }
};
