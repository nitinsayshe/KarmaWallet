import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { DataSourceModel, IDataSourceDocument } from '../../models/dataSource';

export const generateCompanyDataSourceMappingsList = async () => {
  const companyDataSources = await CompanyDataSourceModel
    .find({})
    .populate([
      {
        path: 'company',
        model: CompanyModel,
      },
      {
        path: 'source',
        model: DataSourceModel,
      },
    ])
    .lean();

  const companyDataSourcesList = companyDataSources.map(companyDataSource => ({
    companyName: (companyDataSource.company as ICompanyDocument).companyName,
    companyId: (companyDataSource.company as ICompanyDocument)._id,
    dataSourceName: (companyDataSource.source as IDataSourceDocument).name,
    dataSourceId: (companyDataSource.source as IDataSourceDocument)._id,
    startDate: companyDataSource.dateRange.start,
    endDate: companyDataSource.dateRange.end,
    isPrimary: companyDataSource.isPrimary,
    status: companyDataSource.status,
  }));

  const _csv = parse(companyDataSourcesList);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'company_data_source_mappings.csv'), _csv);
};
