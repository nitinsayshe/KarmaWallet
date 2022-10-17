import fs from 'fs';
import path from 'path';
import { CompanyModel } from '../../models/company';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { DataSourceMappingModel } from '../../models/dataSourceMapping';

export const getCompaniesWithCompleteData = async (threshold: number) => {
  const evaluatedCompanies = fs.readFileSync(path.resolve(__dirname, './.tmp', 'evaluated_companies.json'), 'utf8');
  const parsedCompanies = JSON.parse(evaluatedCompanies);
  const completeCompanies = parsedCompanies.filter((company: any) => company.evaluatedUnsdgCount >= threshold).length;
  const incompleteCompanies = parsedCompanies.filter((company: any) => company.evaluatedUnsdgCount < threshold && company.evaluatedUnsdgCount > 0).length;
  const companiesWithNoData = parsedCompanies.filter((company: any) => company.evaluatedUnsdgCount === 0).length;

  console.log(`\n[+] Threshold ${threshold} ${completeCompanies} companies have complete data, ${incompleteCompanies} companies have incomplete data, ${companiesWithNoData} companies have no data.`);
};

interface IEvaluatedCompany {
  companyName: string;
  companyId: string;
  evaluatedUnsdgCount: number;
  evalutedUnsdgs: Object;
}

export const getEvaluatedUNSDGsCountForCompanies = async () => {
  let count = 0;
  const evaluatedCompanies: IEvaluatedCompany[] = [];
  const companies = await CompanyModel.find({});

  for (const company of companies) {
    count += 1;

    const unsdgs = {
      unsdg1: false,
      unsdg2: false,
      unsdg3: false,
      unsdg4: false,
      unsdg5: false,
      unsdg6: false,
      unsdg7: false,
      unsdg8: false,
      unsdg9: false,
      unsdg10: false,
      unsdg11: false,
      unsdg12: false,
      unsdg13: false,
      unsdg14: false,
      unsdg15: false,
      unsdg16: false,
      unsdg17: false,
    };
    // ensure data source not expired
    const companyDataSources = await CompanyDataSourceModel.find({ company: company._id, 'dateRange.start': { $lte: new Date() }, 'dateRange.end': { $gte: new Date() } });
    if (!companyDataSources) throw new Error('Company data sources not found');

    for (const dataSource of companyDataSources) {
      const unsdgsMapping = await DataSourceMappingModel.findOne({ source: dataSource.source });

      for (let i = 0; i < unsdgsMapping.unsdgs.length; i++) {
        const propertyName = `unsdg${i + 1}`;
        if (!!unsdgsMapping.unsdgs[i].exists) {
          // @ts-ignore
          unsdgs[propertyName] = true;
        }
      }
    }

    evaluatedCompanies.push({
      companyName: company.companyName,
      companyId: company._id.toString(),
      evaluatedUnsdgCount: Object.values(unsdgs).filter(u => !!u).length,
      // @ts-ignore
      unsdgs,
    });

    console.log('[+] evaluating company number:', count);
  }

  fs.writeFileSync(path.join(__dirname, '.tmp', 'evaluated_companies.json'), JSON.stringify(evaluatedCompanies, null, 2));
};
