import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import dayjs from 'dayjs';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { DataSourceModel, IDataSourceDocument } from '../../models/dataSource';
import { DataSourceMappingModel } from '../../models/dataSourceMapping';
import { IUnsdgDocument, UnsdgModel } from '../../models/unsdg';
import { IUnsdgTargetDocument, UnsdgTargetModel } from '../../models/unsdgTarget';

export const generateCompanyDataSourceMappingReport = async () => {
  const companyDataSourceMappings = await CompanyDataSourceModel.find({})
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

  const _compayDataSourceMappings = parse(companyDataSourceMappings.map(c => ({
    companyId: (c.company as ICompanyDocument)._id,
    companyName: (c.company as ICompanyDocument).companyName,
    dataSource: (c.source as IDataSourceDocument).name,
    expiration: dayjs(c.dateRange.end).format('MMM DD, YYYY'),
    isPrimary: c.isPrimary,
  })));
  fs.writeFileSync(path.join(__dirname, '.tmp', 'all_company_data_source_mappings.csv'), _compayDataSourceMappings);

  const dataSourceUnsdgMappings = await DataSourceMappingModel.find({})
    .populate([
      {
        path: 'source',
        model: DataSourceModel,
      },
      {
        path: 'unsdgs.unsdg',
        model: UnsdgModel,
      },
      {
        path: 'unsdgs.targets.target',
        model: UnsdgTargetModel,
      },
    ]);

  const _dataSourceUnsdgMappings = parse(dataSourceUnsdgMappings.map(x => {
    const vals: { [key: string]: any } = {};

    for (let i = 0; i < x.unsdgs.length; i++) {
      const unsdg = x.unsdgs[i].unsdg as IUnsdgDocument;
      vals[unsdg.title] = x.unsdgs[i].value === null ? '' : x.unsdgs[i].value;

      for (let t = 0; t < x.unsdgs[i].targets.length; t++) {
        const target = (x.unsdgs[i].targets[t].target as IUnsdgTargetDocument);
        vals[`target${target.title}`] = x.unsdgs[i].targets[t].value === null ? '' : x.unsdgs[i].targets[t].value;
      }
    }

    return {
      source: (x.source as IDataSourceDocument).name,
      ...vals,
    };
  }));
  fs.writeFileSync(path.join(__dirname, '.tmp', 'all_data_source_unsdg_target_mappings.csv'), _dataSourceUnsdgMappings);

  const companies = await CompanyModel.find({}).lean();

  const _companies = parse(companies.map(c => ({
    id: c._id,
    name: c.companyName,
    score: c.combinedScore,
  })));

  fs.writeFileSync(path.join(__dirname, '.tmp', 'all_company_scores.csv'), _companies);

  const companyDataSourceUnsdgMappings: { [key: string]: any }[] = [];

  for (const company of companies) {
    const companyDataSources = await CompanyDataSourceModel.find({ company });

    for (const companyDataSource of companyDataSources) {
      const source = dataSourceUnsdgMappings.find(d => (d.source as IDataSourceDocument)._id.toString() === companyDataSource.source.toString());

      const vals: { [key: string]: any } = {};

      for (let i = 0; i < source.unsdgs.length; i++) {
        const unsdg = source.unsdgs[i].unsdg as IUnsdgDocument;
        vals[unsdg.title] = source.unsdgs[i].value === null ? '' : source.unsdgs[i].value;

        for (let t = 0; t < source.unsdgs[i].targets.length; t++) {
          const target = (source.unsdgs[i].targets[t].target as IUnsdgTargetDocument);
          vals[`target${target.title}`] = source.unsdgs[i].targets[t].value === null ? '' : source.unsdgs[i].targets[t].value;
        }
      }

      companyDataSourceUnsdgMappings.push({
        dataSource: (source.source as IDataSourceDocument).name,
        companyName: company.companyName,
        companyId: company._id.toString(),
        ...vals,
      });
    }
  }

  const _companyDataSourceUnsdgMappings = parse(companyDataSourceUnsdgMappings);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'all_company_data_source_unsdg_mappings.csv'), _companyDataSourceUnsdgMappings);
};
