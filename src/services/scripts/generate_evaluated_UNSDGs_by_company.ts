import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import fs from 'fs';
import path from 'path';
import { CompanyModel } from '../../models/company';
import { CompanyDataSourceModel, ICompanyDataSourceModel } from '../../models/companyDataSource';
import { UnsdgModel } from '../../models/unsdg';
import { DataSourceMappingModel } from '../../models/dataSourceMapping';
import { CompanyUnsdgModel } from '../../models/companyUnsdg';

dayjs.extend(utc);

export const getCompaniesWithCompleteData = async () => {
  const evaluatedCompanies = fs.readFileSync(path.resolve(__dirname, './.tmp', 'evaluated_companies.json'), 'utf8');
  const parsedCompanies = JSON.parse(evaluatedCompanies);
  const evaluatedData = [];
  const thresholds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  for (const threshold of thresholds) {
    const completeCompanies = parsedCompanies.filter((company: any) => company.evaluatedUnsdgCount >= threshold).length;
    const incompleteCompanies = parsedCompanies.filter((company: any) => company.evaluatedUnsdgCount < threshold && company.evaluatedUnsdgCount > 0).length;

    evaluatedData.push({
      threshold,
      completeCompanies,
      incompleteCompanies,
    });
  }

  fs.writeFileSync(path.join(__dirname, '.tmp', 'complete_data_thresholds.json'), JSON.stringify(evaluatedData, null, 2));
};

interface IEvaluatedCompany {
  companyName: string;
  companyId: string;
  evaluatedUnsdgCount: number;
  evalutedUnsdgs: Object;
}

interface IGetEvaluatedUNSDGsCountForCompanies {
  companyId?: string;
  startingIndex?: number;
}

export const ___getEvaluatedUNSDGsCountForCompanies = async () => {
  let count = 0;
  let errorCount = 0;
  const errorCompanies = [];
  const evaluatedCompanies: IEvaluatedCompany[] = [];
  const companies = await CompanyModel.find({ merchant: { $ne: null } });
  const now = dayjs().utc().toDate();

  for (const company of companies) {
    if (!!company.hidden.status) {
      console.log(`skipping hidden company: ${company.companyName}`);
      continue;
    }
    console.log(`[+] ${count} of ${companies.length}, evaluating company ${company.companyName}`);
    count += 1;
    const childCompanyDataSources: ICompanyDataSourceModel[] = [];
    let companyDataSources: ICompanyDataSourceModel[] = [];
    let parentCompanyDataSources: ICompanyDataSourceModel[] = [];

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

    try {
      // ensure data source not expired
      companyDataSources = await CompanyDataSourceModel.find({
        $and: [
          { company: company._id },
          { 'dateRange.start': { $lte: now } },
          { 'dateRange.end': { $gte: now } },
        ],
      });

      if (company.parentCompany) {
        parentCompanyDataSources = await CompanyDataSourceModel.find({
          $and: [
            { company: company.parentCompany },
            { 'dateRange.start': { $lte: now } },
            { 'dateRange.end': { $gte: now } },
          ],
        });
      }

      // Saving children dictionary for faster lookup
      const childCompanyDataSourceDictionary = childCompanyDataSources.reduce((acc, curr) => {
        const key = curr.source.toString();
        acc[key] = true;
        return acc;
      }, {} as { [key: string]: boolean });

      parentCompanyDataSources = parentCompanyDataSources.filter((ps) => !childCompanyDataSourceDictionary[ps.source.toString()]);
      companyDataSources = [...companyDataSources, ...parentCompanyDataSources];
    } catch {
      errorCount += 1;
      errorCompanies.push(company.companyName);
      console.log(`[-] error retrieving company data sources and unsdg mappings for company: ${company._id}`);
      continue;
    }

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
    console.log(evaluatedCompanies);
  }
  console.log(`[+] error count: ${errorCount}, ${errorCompanies.join(', ')}`);

  fs.writeFileSync(path.join(__dirname, '.tmp', 'evaluatedCompanies'), JSON.stringify(evaluatedCompanies, null, 2));
};

export const getEvaluatedUNSDGsCountForCompanies = async ({
  companyId = null,
  startingIndex = null,
}: IGetEvaluatedUNSDGsCountForCompanies) => {
  let count = 0;
  let errorCount = 0;
  const errorCompanies = [];
  let companies = companyId ? await CompanyModel.find({ _id: companyId }) : await CompanyModel.find({ 'hidden.status': false });
  const now = dayjs().utc().toDate();
  const unsdgObjects = await UnsdgModel.find({}).sort({ goalNum: 1 });
  if (startingIndex) companies = companies.slice(startingIndex);
  for (const company of companies) {
    if (!!company.hidden.status) {
      console.log(`skipping hidden company: ${company.companyName}`);
      continue;
    }
    console.log(`[+] ${count} of ${companies.length}, evaluating company ${company.companyName}`);
    count += 1;
    const childCompanyDataSources: ICompanyDataSourceModel[] = [];
    let companyDataSources: ICompanyDataSourceModel[] = [];
    let parentCompanyDataSources: ICompanyDataSourceModel[] = [];

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

    try {
      // ensure data source not expired
      companyDataSources = await CompanyDataSourceModel.find({
        $and: [
          { company: company._id },
          { 'dateRange.start': { $lte: now } },
          { 'dateRange.end': { $gte: now } },
        ],
      });

      if (company.parentCompany) {
        parentCompanyDataSources = await CompanyDataSourceModel.find({
          $and: [
            { company: company.parentCompany },
            { 'dateRange.start': { $lte: now } },
            { 'dateRange.end': { $gte: now } },
          ],
        });
      }

      // Saving children dictionary for faster lookup
      const childCompanyDataSourceDictionary = childCompanyDataSources.reduce((acc, curr) => {
        const key = curr.source.toString();
        acc[key] = true;
        return acc;
      }, {} as { [key: string]: boolean });

      parentCompanyDataSources = parentCompanyDataSources.filter((ps) => !childCompanyDataSourceDictionary[ps.source.toString()]);
      companyDataSources = [...companyDataSources, ...parentCompanyDataSources];
    } catch {
      errorCount += 1;
      errorCompanies.push(company.companyName);
      console.log(`[-] error retrieving company data sources and unsdg mappings for company: ${company._id} (error: ${errorCount})`);
      continue;
    }

    for (const dataSource of companyDataSources) {
      const unsdgsMapping = await DataSourceMappingModel.findOne({ source: dataSource.source });
      if (!unsdgsMapping || !unsdgsMapping.unsdgs) {
        console.log(`[-] error retrieving company data sources and unsdg mappings for company: ${company._id} source: ${dataSource?.source}`);
      }

      for (let i = 0; i < unsdgsMapping?.unsdgs.length; i++) {
        const propertyName = `unsdg${i + 1}`;
        if (!!unsdgsMapping.unsdgs[i].exists) {
          // @ts-ignore
          unsdgs[propertyName] = true;
        }
      }
    }

    company.evaluatedUnsdgs = [];

    Object.keys(unsdgs).forEach((key: string, i) => {
      // @ts-ignore
      const unsdgObject = unsdgObjects[i];

      company.evaluatedUnsdgs.push({
        // @ts-ignore
        unsdg: unsdgObject._id,
        // @ts-ignore
        evaluated: !!unsdgs[key],
        score: null,
      });
    });

    for (const evaluatedUnsdg of company.evaluatedUnsdgs) {
      const { unsdg } = evaluatedUnsdg;
      const companyUnsdg = await CompanyUnsdgModel.findOne({ company: company._id, unsdg });
      if (!companyUnsdg) continue;
      if (!!evaluatedUnsdg.evaluated) evaluatedUnsdg.score = companyUnsdg.value;
      else evaluatedUnsdg.score = null;
    }

    await company.save();
  }
};
