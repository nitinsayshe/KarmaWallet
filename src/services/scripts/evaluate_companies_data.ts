import fs from 'fs';
import path from 'path';
import { CompanyModel } from '../../models/company';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { DataSourceMappingModel } from '../../models/dataSourceMapping';

// export const getCompaniesWithCompleteData = async (threshold: number) => {
//   let companyCount = 0;
//   let companiesWithComplete = 0;
//   let companiesNoDataSource = 0;
//   let companiesWithNoUnsdgs = 0;
//   const evaluatedCompanies = [];

//   const companies = await CompanyModel.find({});

//   for (const company of companies) {
//     companyCount += 1;
//     const unsdgs = {};

//     if (companyCount < 2) {
//       console.log(`[+] checking company ${company.companyName}`);
//       const unsdgsCount = 0;
//       // ensure data source not expired
//       const companyDataSources = await CompanyDataSourceModel.find({ company: company._id, 'dateRange.start': { $lte: new Date() }, 'dateRange.end': { $gte: new Date() } });
//       if (!companyDataSources) {
//         companiesNoDataSource += 1;
//         throw new Error('Company data sources not found');
//       }

//       for (const dataSource of companyDataSources) {
//         const unsdgsMapping = await DataSourceMappingModel.findOne({ source: dataSource.source });
//         console.log('/////// these are the mappings: ', unsdgsMapping);

//         for (const unsdg of unsdgsMapping.unsdgs) {
//           if (!!unsdg.exists) {

//           }
//         }
//       }

//       console.log(`[+] unsdgs count: ${unsdgsCount}`);

//       if (unsdgsCount >= threshold) companiesWithComplete += 1;
//       if (unsdgsCount === 0) companiesWithNoUnsdgs += 1;
//     }
//   }

//   console.log(`[INFO]: There are ${companiesWithComplete} companies with complete data, ${companiesNoDataSource} companies with no data sources, and ${companiesWithNoUnsdgs} companies with no unsdgs`);
// };

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
