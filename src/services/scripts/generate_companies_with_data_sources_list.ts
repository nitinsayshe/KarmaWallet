import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { CompanyUnsdgModel } from '../../models/companyUnsdg';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { IUnsdgDocument, UnsdgModel } from '../../models/unsdg';

interface ICompanyReportData {
  [key: string]: string | boolean | number;
}

interface IReportDictionary {
  [key: string]: ICompanyReportData;
}

export const generateCompaniesWithDataSourcesList = async () => {
  console.log('\ngenerating companies with data sources list...\n');

  let companies: ICompanyDocument[];

  try {
    companies = await CompanyModel.find({}).lean();
  } catch (err) {
    console.log('\n[-] error getting companies');
    console.log(err, '\n');
  }

  if (!companies) return;

  const allCompanyData: IReportDictionary = {};

  let count = 0;
  let errorCount = 0;

  for (const company of companies) {
    if (!allCompanyData[company._id.toString()]) {
      allCompanyData[company._id.toString()] = {
        hasDataSources: false,
        companyId: company._id.toString(),
        companyName: company.companyName,
        companyScore: company.combinedScore,
      };
    }

    try {
      const dataSource = await CompanyDataSourceModel.findOne({ company: company._id });
      if (!!dataSource) allCompanyData[company._id.toString()].hasDataSources = true;
    } catch (err) {
      console.log('\n[-] error getting data sources');
      console.log(err, '\n');
      delete allCompanyData[company._id.toString()];
      errorCount += 1;
      continue;
    }

    if (!allCompanyData[company._id.toString()].hasDataSources) continue;

    try {
      const unsdgs = await CompanyUnsdgModel.find({ company: company._id }).populate({ path: 'unsdg', model: UnsdgModel });

      if (unsdgs.length !== 16) {
        console.log(`[-] invalid unsdgs count for company: ${company._id} =>`, unsdgs.length);
        delete allCompanyData[company._id.toString()];
        errorCount += 1;
        continue;
      }

      for (const unsdg of unsdgs) {
        const unsdgName = `unsdg${(unsdg.unsdg as IUnsdgDocument).goalNum}`;
        allCompanyData[company._id.toString()][unsdgName] = unsdg.value;
      }
    } catch (err) {
      console.log('\n[-] error getting unsdgs');
      console.log(err, '\n');
      delete allCompanyData[company._id.toString()];
      errorCount += 1;
      continue;
    }

    count += 1;

    if (count % 500 === 0) {
      console.log(`${Math.round((count / companies.length) * 100)}% complete`);
    }
  }

  const _csv = parse(Object.values(allCompanyData));
  fs.writeFileSync(path.join(__dirname, '.tmp', 'companies_with_data_sources.csv'), _csv);

  console.log('\nsuccesses: ', count);
  console.log('errors: ', errorCount, '\n');
};
