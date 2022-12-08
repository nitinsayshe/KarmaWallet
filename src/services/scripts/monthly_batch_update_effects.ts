import { mapValuesToCompanies } from './map_values_to_companies';
import { calculateAvgScores } from './calculate_avg_sector_scores';
import { calculateAllCompanyScores } from './calculate_company_scores';
import { hideCompaniesWithoutDataSources } from './hide_companies_without_data_sources';
import { checkCompanySectorsForMainTierSector } from './check_company_sectors_for_main_tier_sector';
import { removeDeletedCompaniesFromManualMatches } from './delete_manual_matches';

const skipScores = false;

export const monthlyBatchUpdateEffects = async () => {
  await checkCompanySectorsForMainTierSector();
  await calculateAllCompanyScores();
  await calculateAvgScores({ writeToDisk: false });
  // adding values throws errors bc of duplicate keys: name
  await mapValuesToCompanies();
  await hideCompaniesWithoutDataSources();
  await removeDeletedCompaniesFromManualMatches();
  // await matchExistingTransactions();
  // await GenerateUserTransactionTotals.exec();
  // await GenerateUserImpactTotals.exec();
  // await UserMonthlyImpactReports.exec({ generateFullHistory: true });
};
