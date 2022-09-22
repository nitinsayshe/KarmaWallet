import { generateValues } from './add_new_values';
import { calculateAvgScores } from './calculate_avg_sector_scores';
import { calculateAllCompanyScores } from './calculate_company_scores';
import matchExistingTransactions from './match-existing-transactions';
import * as GenerateUserImpactTotals from '../../jobs/generateUserImpactTotals';
import * as GenerateUserTransactionTotals from '../../jobs/generateUserTransactionTotals';
import * as UserMonthlyImpactReports from '../../jobs/userMonthlyImpactReports';
import { hideCompaniesWithoutDataSources } from './hide_companies_without_data_sources';

const skipScores = true;

export const monthlyBatchUpdateEffects = async () => {
  if (!skipScores) await calculateAllCompanyScores();
  if (!skipScores) await calculateAvgScores({ writeToDisk: false });
  // adding values throws errors bc of duplicate keys: name
  if (!skipScores) await generateValues();
  if (!skipScores) await hideCompaniesWithoutDataSources();

  await matchExistingTransactions();
  await GenerateUserTransactionTotals.exec();
  await GenerateUserImpactTotals.exec();
  await UserMonthlyImpactReports.exec({ generateFullHistory: true });
};
