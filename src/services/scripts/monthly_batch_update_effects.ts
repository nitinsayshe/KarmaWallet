import { mapValuesToCompanies } from './map_values_to_companies';
import { calculateAvgScores } from './calculate_avg_sector_scores';
import { calculateAllCompanyScores } from './calculate_company_scores';
import { hideCompaniesWithoutDataSources } from './hide_companies_without_data_sources';
import { checkCompanySectorsForMainTierSector } from './check_company_sectors_for_main_tier_sector';
import { removeDeletedCompaniesFromManualMatches } from './delete_manual_matches';
import * as GenerateUserTransactionTotals from '../../jobs/generateUserTransactionTotals';
import * as GenerateUserImpactTotals from '../../jobs/generateUserImpactTotals';
import * as UserMonthlyImpactReports from '../../jobs/userMonthlyImpactReports';
import { ValueCompanyAssignmentType, ValueCompanyMappingModel } from '../../models/valueCompanyMapping';
import { getEvaluatedUNSDGsCountForCompanies } from './generate_evaluated_UNSDGs_by_company';
import { globalTransactionUpdates } from './global_transaction_updates';

export const monthlyBatchUpdateEffects = async ({
  runScores = true,
  runTransactions = false,
}) => {
  if (runScores) {
    await ValueCompanyMappingModel.deleteMany({ assignmentType: ValueCompanyAssignmentType.DataSourceInherited });
    await checkCompanySectorsForMainTierSector();
    await calculateAllCompanyScores({});
    await calculateAvgScores({ writeToDisk: false });
    // adding values throws errors bc of duplicate keys: name
    await mapValuesToCompanies();
    await getEvaluatedUNSDGsCountForCompanies({});
    await hideCompaniesWithoutDataSources();
    await removeDeletedCompaniesFromManualMatches();
  }
  if (runTransactions) {
    await globalTransactionUpdates({});
    await GenerateUserTransactionTotals.exec();
    await GenerateUserImpactTotals.exec();
    await UserMonthlyImpactReports.exec({ generateFullHistory: true });
  }
};
