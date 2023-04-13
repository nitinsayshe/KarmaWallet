import { mapValuesToCompanies } from './map_values_to_companies';
import { calculateAvgScores } from './calculate_avg_sector_scores';
import { calculateAllCompanyScores } from './calculate_company_scores';
import { hideCompaniesWithoutDataSources } from './hide_companies_without_data_sources';
import { checkCompanySectorsForMainTierSector } from './check_company_sectors_for_main_tier_sector';
import { removeDeletedCompaniesFromManualMatches } from './delete_manual_matches';
import matchExistingTransactions from './match-existing-transactions';
import * as GenerateUserTransactionTotals from '../../jobs/generateUserTransactionTotals';
import * as GenerateUserImpactTotals from '../../jobs/generateUserImpactTotals';
import * as UserMonthlyImpactReports from '../../jobs/userMonthlyImpactReports';
import { CompanyUnsdgModel } from '../../models/companyUnsdg';
import { ValueCompanyAssignmentType, ValueCompanyMappingModel } from '../../models/valueCompanyMapping';
import { getEvaluatedUNSDGsCountForCompanies } from './generate_evaluated_UNSDGs_by_company';

const runScores = true;
const runTransactions = false;

export const monthlyBatchUpdateEffects = async () => {
  if (runScores) {
    await CompanyUnsdgModel.deleteMany({});
    await ValueCompanyMappingModel.deleteMany({ assignmentType: ValueCompanyAssignmentType.DataSourceInherited });
    await checkCompanySectorsForMainTierSector();
    await calculateAllCompanyScores();
    await calculateAvgScores({ writeToDisk: false });
    // adding values throws errors bc of duplicate keys: name
    await mapValuesToCompanies();
    await getEvaluatedUNSDGsCountForCompanies({});
    await hideCompaniesWithoutDataSources();
    await removeDeletedCompaniesFromManualMatches();
  }
  if (runTransactions) {
    await matchExistingTransactions({});
    await GenerateUserTransactionTotals.exec();
    await GenerateUserImpactTotals.exec();
    await UserMonthlyImpactReports.exec({ generateFullHistory: true });
  }
};
