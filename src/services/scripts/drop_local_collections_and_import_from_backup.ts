import fs from 'fs';
import path from 'path';
import { CardModel } from '../../models/card';
import { CommissionPayoutModel } from '../../models/commissionPayout';
import { CommissionModel } from '../../models/commissions';
import { CompanyModel } from '../../models/company';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { CompanyUnsdgModel } from '../../models/companyUnsdg';
import { DataSourceMappingModel } from '../../models/dataSourceMapping';
import { DataSourceModel } from '../../models/dataSource';
import { GroupModel } from '../../models/group';
import { MatchedCompanyNameModel } from '../../models/matchedCompanyName';
import { MerchantRateModel } from '../../models/merchantRate';
import { MerchantModel } from '../../models/merchant';
import { MiscModel } from '../../models/misc';
import { PlaidCategoriesToSectorMappingModel } from '../../models/plaidCategoriesToKarmaSectorMapping';
import { PlaidCategoryMappingModel } from '../../models/plaidCategoryMapping';
import { SectorModel } from '../../models/sector';
import { StatementModel } from '../../models/statement';
import { TransactionModel } from '../../models/transaction';
import { UnmatchedCompanyNameModel } from '../../models/unmatchedCompanyName';
import { UnsdgCategoryModel } from '../../models/unsdgCategory';
import { UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { UnsdgModel } from '../../models/unsdg';
import { UnsdgTargetModel } from '../../models/unsdgTarget';
import { UserGroupModel } from '../../models/userGroup';
import { UserImpactTotalModel } from '../../models/userImpactTotals';
import { UserMontlyImpactReportModel } from '../../models/userMonthlyImpactReport';
import { UserModel } from '../../models/user';
import { ValueCompanyMappingModel } from '../../models/valueCompanyMapping';
import { ValueDataSourceMappingModel } from '../../models/valueDataSourceMapping';
import { ValueModel } from '../../models/value';
import { CollectionNames } from '../../lib/constants';

const { DB_URL } = process.env;

export interface IImportMappingObject {
  model: any,
  collection: string,
}

const ImportMapping: IImportMappingObject[] = [
  { model: UserModel, collection: 'users' },
  { model: UserGroupModel, collection: 'user_groups' },
  { model: GroupModel, collection: 'groups' },
  { model: CardModel, collection: 'cards' },
  { model: TransactionModel, collection: 'transactions' },
  { model: StatementModel, collection: 'statements' },
  { model: MerchantModel, collection: 'merchants' },
  { model: MerchantRateModel, collection: 'merchant_rates' },
  { model: CompanyModel, collection: 'companies' },
  { model: CompanyDataSourceModel, collection: 'company_data_sources' },
  { model: CompanyUnsdgModel, collection: 'company_unsdgs' },
  { model: DataSourceModel, collection: 'data_sources' },
  { model: DataSourceMappingModel, collection: 'data_source_mappings' },
  { model: MatchedCompanyNameModel, collection: 'matched_company_names' },
  { model: UnmatchedCompanyNameModel, collection: 'unmatched_company_names' },
  { model: UnsdgModel, collection: 'unsdgs' },
  { model: UnsdgCategoryModel, collection: 'unsdg_categories' },
  { model: UnsdgSubcategoryModel, collection: 'unsdg_subcategories' },
  { model: UnsdgTargetModel, collection: 'unsdg_targets' },
  { model: SectorModel, collection: 'sectors' },
  { model: PlaidCategoryMappingModel, collection: 'plaid_category_mappings' },
  { model: PlaidCategoriesToSectorMappingModel, collection: 'plaid_categories_to_sector_mappings' },
  { model: ValueModel, collection: 'values' },
  { model: ValueCompanyMappingModel, collection: 'value_company_mappings' },
  { model: ValueDataSourceMappingModel, collection: 'value_data_source_mappings' },
  { model: CommissionModel, collection: 'commissions' },
  { model: CommissionPayoutModel, collection: 'commission_payouts' },
  { model: UserImpactTotalModel, collection: 'user_impact_totals' },
  { model: UserMontlyImpactReportModel, collection: 'user_monthly_impact_reports' },
  { model: MiscModel, collection: 'misc' },
];

export interface ICollectionToImport {
  collection: string;
  path: string;
}

export const dropLocalCollectionsAndImportFromBackup = async (
  backups: string[],
  collectionsToSkip: CollectionNames[] = [],
) => {
  const collectionsToImport: ICollectionToImport[] = [];
  if (DB_URL) throw new Error('This script should only be run for local databases');
  for (const backup of backups) {
    const backupPath = path.join('./.backups', backup);
    if (!fs.existsSync(backupPath)) throw new Error(`Backup ${backup} does not exist`);
    const files = fs.readdirSync(backupPath);
    for (const file of files) {
      const collectionName = file.replace('.json', '');
      const filePath = path.join(backupPath, file);
      collectionsToImport.push({ collection: collectionName, path: filePath });
    }
  }
  for (const importMapping of ImportMapping) {
    const collectionToImport = collectionsToImport.find((c) => c.collection === importMapping.collection);

    if (collectionToImport) {
      if (collectionsToSkip.includes(importMapping.collection as CollectionNames)) {
        console.log(`Skipping ${importMapping.collection}`);
        continue;
      }
      console.log(`Importing ${collectionToImport.collection}`);
      try {
        await (importMapping.model as any).collection.drop();
      } catch (e: any) {
        if (e.message !== 'ns not found') throw e;
      }
      const data = JSON.parse(fs.readFileSync(collectionToImport.path, 'utf8'));
      // Larger collections must be handled invidvidually to avoid memory issues
      if ([CollectionNames.Transaction, CollectionNames.CompanyUnsdg].includes(collectionToImport.collection as CollectionNames)) {
        let itemCount = 0;
        for (const item of data) {
          itemCount += 1;
          console.log(`saving ${collectionToImport.collection} ${itemCount} of ${data.length}`);
          // eslint-disable-next-line new-cap
          const newItem = new importMapping.model(item);
          await newItem.save();
        }
      } else await importMapping.model.insertMany(data);
      console.log(`Imported ${collectionToImport.collection}`);
    } else console.log(`Skipping ${importMapping.collection}`);
  }
};
