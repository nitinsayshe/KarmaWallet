import path from 'path';
import csvtojson from 'csvtojson';
import { DataSourceModel, IDataSourceDocument } from '../../models/dataSource';
import { IUnsdgCategoryDocument, UnsdgCategoryModel } from '../../models/unsdgCategory';
import { IValueDocument, ValueModel } from '../../models/value';
import { IValueDataSourceMappingDocument, ValueDataSourceMappingModel } from '../../models/valueDataSourceMapping';
import { CompanyModel } from '../../models/company';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { ValueCompanyAssignmentType, ValueCompanyMappingModel, ValueCompanyWeightMultiplier } from '../../models/valueCompanyMapping';

interface IRawValueMapping {
  category: 'Planet' | 'People';
  weight: string;
  value: string;
  [key: string]: string;
}

interface IData {
  dataSources: IDataSourceDocument[];
  categories: IUnsdgCategoryDocument[];
  rawData: IRawValueMapping[];
  values: IValueDocument[];
  mappings: IValueDataSourceMappingDocument[];
}

const prepData = async (): Promise<IData> => {
  let dataSources: IDataSourceDocument[] = [];
  let categories: IUnsdgCategoryDocument[] = [];
  let rawData: IRawValueMapping[];

  try {
    dataSources = await DataSourceModel.find({});
    categories = await UnsdgCategoryModel.find({});
    rawData = await csvtojson().fromFile(path.resolve(__dirname, '.tmp', 'value-system.csv'));
  } catch (err) {
    console.log('[-] error retrieving raw data source mapping data from csv');
    console.log(err, '');
    return;
  }

  if (!dataSources?.length || !categories?.length || !rawData?.length) return;

  return {
    dataSources,
    categories,
    rawData,
    values: [],
    mappings: [],
  };
};

const areValidateValues = async ({ categories, dataSources, rawData }: IData) => {
  console.log('validating raw data...');
  let isValid = true;

  for (const row of rawData) {
    const rowDataSources: IDataSourceDocument[] = [];
    const missing: string[] = [];
    let rowDataSourcesCount = 0;

    for (const key in row) {
      if (row[key] !== '1') continue;

      rowDataSourcesCount += 1;

      const dataSource = dataSources.find(ds => ds.name === key);
      if (!!dataSource) {
        rowDataSources.push(dataSource);
      } else {
        missing.push(key);
        isValid = false;
        continue;
      }
    }

    if (rowDataSources.length !== rowDataSourcesCount) {
      console.log(`[-] invalid data source(s) for ${row.value}:`, missing);
      isValid = false;
      continue;
    }

    const category = categories.find(c => c.name === row.category);

    if (!category) {
      console.log(`[-] invalid category for ${row.value}:`, row.category);
      isValid = false;
      continue;
    }

    const weight = parseFloat(`${row.weight}`);

    if (isNaN(weight)) {
      console.log(`[-] invalid weight for ${row.value}:`, row.weight);
      isValid = false;
      continue;
    }
  }

  return isValid;
};

const createNewValues = async (data: IData) => {
  console.log('creating new values...');
  const { categories, rawData } = data;
  let count = 0;

  for (const row of rawData) {
    const category = categories.find(c => c.name === row.category);

    const newValue = new ValueModel({
      category,
      name: row.value,
      weight: parseFloat(`${row.weight}`),
    });

    try {
      data.values.push(await newValue.save());
      count += 1;
    } catch (err) {
      console.log('[-] error saving new value');
      console.log(err, '');
    }
  }

  console.log(`[+] ${count}/${rawData.length} values created successfully`);
  return data;
};

export const mapValuesToDataSources = async (data: IData) => {
  console.log('mapping values to data sources...');
  const { values, dataSources, rawData } = data;
  let mappingCount = 0;
  let totalCount = 0;

  for (const row of rawData) {
    const value = values.find(v => v.name === row.value);
    if (!value) continue;

    for (const key in row) {
      if (row[key] !== '1') continue;

      totalCount += 1;

      const dataSource = dataSources.find(ds => ds.name === key);
      if (!dataSource) continue;

      const mapping = new ValueDataSourceMappingModel({
        dataSource,
        value,
      });

      try {
        data.mappings.push(await mapping.save());
        mappingCount += 1;
      } catch (err) {
        console.log(`[-] failed to create mapping for: ${value.name} => ${dataSource.name}`);
        console.log(err, '');
        continue;
      }
    }
  }

  console.log(`[+] ${mappingCount}/${totalCount} value to data source mappings created successfully`);
};

export const mapValuesToCompanies = async (data: IData) => {
  console.log('mapping values to companies...');
  const companies = await CompanyModel.find({});
  let count = 0;

  for (const company of companies) {
    const companyValues = await ValueCompanyMappingModel.find({ company });
    const companyDataSources = await CompanyDataSourceModel.find({ company, status: { $gt: 0 } });

    for (const companyDataSource of companyDataSources) {
      const mapping = data.mappings.find(m => (m.dataSource as IDataSourceDocument)._id.toString() === companyDataSource.source.toString());

      if (!mapping) continue;

      const companyValue = companyValues.find(v => v.value.toString() === mapping.value.toString());

      if (!!companyValue && companyValue.weightMultiplier !== ValueCompanyWeightMultiplier.DataSource) continue;

      try {
        if (!!companyValue) {
          companyValue.weightMultiplier = ValueCompanyWeightMultiplier.DataSource;
          companyValue.value = mapping.value;
          await companyValue.save();
        } else {
          const newCompanyValue = new ValueCompanyMappingModel({
            assignmentType: ValueCompanyAssignmentType.DataSourceInherited,
            company,
            value: mapping.value,
            weightMultiplier: ValueCompanyWeightMultiplier.DataSource,
          });

          await newCompanyValue.save();
        }

        count += 1;
      } catch (err) {
        console.log('[-] error saving company value mapping');
        console.log(err);
        continue;
      }
    }
  }

  console.log(`[+] ${count} value to company mappings created successfully`);
};

export const mapValuesToCompanies = async (data: IData) => {
  console.log('mapping values to companies...');
  const companies = await CompanyModel.find({});
  let count = 0;

  for (const company of companies) {
    const companyValues = await ValueCompanyMappingModel.find({ company });
    const companyDataSources = await CompanyDataSourceModel.find({ company, status: { $gt: 0 } });

    for (const companyDataSource of companyDataSources) {
      const mapping = data.mappings.find(m => (m.dataSource as IDataSourceDocument)._id.toString() === companyDataSource.source.toString());

      if (!mapping) continue;

      const companyValue = companyValues.find(v => v.value.toString() === mapping.value.toString());

      if (!!companyValue && companyValue.weightMultiplier !== ValueCompanyWeightMultiplier.DataSource) continue;

      try {
        if (!!companyValue) {
          companyValue.weightMultiplier = ValueCompanyWeightMultiplier.DataSource;
          companyValue.value = mapping.value;
          await companyValue.save();
        } else {
          const newCompanyValue = new ValueCompanyMappingModel({
            assignmentType: ValueCompanyAssignmentType.DataSourceInherited,
            company,
            value: mapping.value,
            weightMultiplier: ValueCompanyWeightMultiplier.DataSource,
          });

          await newCompanyValue.save();
        }

        count += 1;
      } catch (err) {
        console.log('[-] error saving company value mapping');
        console.log(err);
        continue;
      }
    }
  }

  console.log(`[+] ${count} value to company mappings created successfully`);
};

export const generateValues = async (reset = false) => {
  if (!!reset) {
    await ValueModel.deleteMany({});
    await ValueDataSourceMappingModel.deleteMany({});
    await ValueCompanyMappingModel.deleteMany({});
    console.log('[+] values reset successfully');
  }

  let data = await prepData();

  if (!data || !areValidateValues(data)) return;

  data = await createNewValues(data);
  await mapValuesToDataSources(data);
  await mapValuesToCompanies(data);
};
