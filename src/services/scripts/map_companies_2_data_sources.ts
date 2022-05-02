import path from 'path';
import csvtojson from 'csvtojson';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { DataSourceModel, IDataSourceDocument } from '../../models/dataSource';

dayjs.extend(utc);

interface IRawCompany2DataSourcesMapping {
  legacyId: string;
  companyName: string;
  primaryDataSource: string;
  parentCompanyId: string;
  'Safer Choice': string;
  'Expiration: Safer Choice': string;
  'A List CDP - Climate Change': string;
  'Expiration: A List CDP - Climate Change': string;
  'A List CDP - Water Security': string;
  'Expiration: A List CDP - Water Security': string;
  'A List CDP - Forests': string;
  'Expiration: A List CDP - Forests': string;
  'Green Seal': string;
  'Expiration: Green Seal': string;
  '1% for the planet': string;
  'Expiration: 1% for the planet': string;
  'Fair Labor Association': string;
  'Expiration: Fair Labor Association': string;
  'Leaping Bunny Certified': string;
  'Expiration: Leaping Bunny Certified': string;
  'GOTS (Global Organic Textile Standard)': string;
  'Expiration: GOTS (Global Organic Textile Standard)': string;
  'BCI - Better Cotton Initiative': string;
  'Expiration: BCI - Better Cotton Initiative': string;
  'Responsible Jewellery Council': string;
  'Expiration: Responsible Jewellery Council': string;
  'Fairtrade Federation': string;
  'Expiration: Fairtrade Federation': string;
  'World Fairtrade Organization': string;
  'Expiration: World Fairtrade Organization': string;
  'Fairtrade International': string;
  'Expiration: Fairtrade International': string;
  'Goodweave': string;
  'Expiration: Goodweave': string;
  'OCS (Organic Content Standard)': string;
  'Expiration: OCS (Organic Content Standard)': string;
  'Women Owned Directory': string;
  'Expiration: Women Owned Directory': string;
  'Plant Based Foods Association': string;
  'Expiration: Plant Based Foods Association': string;
  'Rainforest Alliance Certified': string;
  'Expiration: Rainforest Alliance Certified': string;
  'RE100': string;
  'Expiration: RE100': string;
  'Ethical Trading Initiative(ETI)': string;
  'Expiration: Ethical Trading Initiative(ETI)': string;
  'Leather Working Group(LWG)': string;
  'Expiration: Leather Working Group(LWG)': string;
  'Slave Free Chocolate': string;
  'Expiration: Slave Free Chocolate': string;
  'Sustainable Packaging Coalition': string;
  'Expiration: Sustainable Packaging Coalition': string;
  'American Humane Certified': string;
  'Expiration: American Humane Certified': string;
}

const dataSourceNames = [
  'Safer Choice',
  'A List CDP - Climate Change',
  'A List CDP - Water Security',
  'A List CDP - Forests',
  'Green Seal',
  '1% for the planet',
  'Fair Labor Association',
  'Leaping Bunny Certified',
  'GOTS (Global Organic Textile Standard)',
  'BCI - Better Cotton Initiative',
  'Responsible Jewellery Council',
  'Fairtrade Federation',
  'World Fairtrade Organization',
  'Fairtrade International',
  'Goodweave',
  'OCS (Organic Content Standard)',
  'Women Owned Directory',
  'Plant Based Foods Association',
  'Rainforest Alliance Certified',
  'RE100',
  'Ethical Trading Initiative(ETI)',
  'Leather Working Group(LWG)',
  'Slave Free Chocolate',
  'Sustainable Packaging Coalition',
  'American Humane Certified',
];

export const mapCompanies2DataSources = async () => {
  console.log('\nmapping data sources to companies...');

  let companies: ICompanyDocument[];
  let dataSources: IDataSourceDocument[];

  try {
    companies = await CompanyModel.find({});
    dataSources = await DataSourceModel.find({});
  } catch (err) {
    console.log('[-] error retrieving companies and data sources');
    console.log(err);
  }

  if (!companies || !dataSources) return;

  let rawData: IRawCompany2DataSourcesMapping[];

  try {
    rawData = await csvtojson().fromFile(path.resolve(__dirname, '.tmp', 'data_source_mappings.csv'));
  } catch (err) {
    console.log('\n[-] error retrieving raw data source mapping data from csv');
    console.log(err, '\n');
  }

  if (!rawData) return;

  let count = 0;

  for (const row of rawData) {
    const company = companies.find(c => c.legacyId.toString() === row.legacyId);

    if (!company) {
      count += 1;
      console.log('>>>>> failed to find company: ', row.legacyId);
    }
  }
};
