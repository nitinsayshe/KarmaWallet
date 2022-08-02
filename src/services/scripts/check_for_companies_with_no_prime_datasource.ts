import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { CompanyModel } from '../../models/company';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { DataSourceModel, IDataSourceDocument } from '../../models/dataSource';

interface IDataRow {
  companyName: string;
  companyId: string;
  dataSourceName: string;
  dataSourceId: string;
  status: number;
}

export const checkForCompaniesWithNoPrimaryDataSource = async () => {
  console.log('generating list of companies with no primary data source...');
  const companies = await CompanyModel.find({ 'creation.status': null });

  const data: IDataRow[] = [];

  for (const company of companies) {
    const companyDataSources = await CompanyDataSourceModel
      .find({
        company: company._id,
        'dateRange.start': { $lte: new Date() },
        'dateRange.end': { $gte: new Date() },
      })
      .populate({
        path: 'source',
        model: DataSourceModel,
      })
      .lean();

    const hasPrimary = companyDataSources.find(c => c.isPrimary);

    if (!hasPrimary) {
      for (const companyDataSource of companyDataSources) {
        data.push({
          companyName: company.companyName,
          companyId: company._id.toString(),
          dataSourceName: (companyDataSource.source as IDataSourceDocument).name,
          dataSourceId: (companyDataSource.source as IDataSourceDocument)._id.toString(),
          status: companyDataSource.status,
        });
      }
    }
  }

  const _csv = parse(data);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'companies_with_no_primary_data_source.csv'), _csv);

  console.log('[+] done');
};
