import fs from 'fs';
import path from 'path';
import { getUtcDate } from '../../lib/date';
import { CollectionNames } from '../../lib/constants';
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

const { DB_URL } = process.env;

const getDBenv = () => {
  // IMPORTANT: THIS COULD CHANGE BASED ON THE ENVIRONMENT IT'S RUNNING IN
  // DO NOT USE ON PROD/STAGING ENVIRONMENTS
  if (!DB_URL) return 'local';
  if (DB_URL.includes('localhost')) return 'local';
  if (DB_URL.includes('staging')) return 'staging';
  if (DB_URL.includes('27112')) return 'prod';
  return 'unknown';
};

export const exportCollections = async (collections: CollectionNames[]) => {
  const models = [
    UserModel,
    CompanyModel,
    DataSourceModel,
    CompanyDataSourceModel,
    CardModel,
    CommissionPayoutModel,
    CommissionModel,
    CompanyUnsdgModel,
    DataSourceMappingModel,
    GroupModel,
    MatchedCompanyNameModel,
    MerchantModel,
    MerchantRateModel,
    MiscModel,
    PlaidCategoriesToSectorMappingModel,
    PlaidCategoryMappingModel,
    SectorModel,
    StatementModel,
    TransactionModel,
    UnmatchedCompanyNameModel,
    UnsdgCategoryModel,
    UnsdgSubcategoryModel,
    UnsdgModel,
    UnsdgTargetModel,
    UserGroupModel,
    UserImpactTotalModel,
    UserMontlyImpactReportModel,
    ValueCompanyMappingModel,
    ValueDataSourceMappingModel,
    ValueModel,
  ];
  if (!fs.existsSync('./.backups')) fs.mkdirSync('./.backups');
  const timestamp = getUtcDate().format('YYYY-MM-DD_HH-mm-ss');
  const dbEnv = getDBenv();
  const backupPath = `./.backups/${timestamp}-${dbEnv}`;
  fs.mkdirSync(backupPath, { recursive: true });

  for (const model of models) {
    const name: typeof CollectionNames[keyof typeof CollectionNames] = (model.collection as any).collectionName;
    if (collections.length && !collections.includes(name)) continue;
    const data: any[] = await (model as any).find({}).lean();
    let json: string;
    if (name === CollectionNames.Transaction) json = `[${data.map(el => JSON.stringify(el)).join(',')}]`;
    else json = JSON.stringify(data);
    const filePath = path.join(backupPath, `${name}.json`);
    fs.writeFileSync(filePath, json);
  }
};
