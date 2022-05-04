import path from 'path';
import csvtojson from 'csvtojson';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { DataSourceModel, IDataSourceDocument } from '../../models/dataSource';
import { CompanyDataSourceModel, ICompanyDataSourceDocument } from '../../models/companyDataSource';

dayjs.extend(utc);

interface IRawCompanyDataSources {
  'SaferChoice': string;
  'A List CDP - Climate Change': string;
  'A List CDP - Water Security': string;
  'A List CDP - Forests': string;
  'Green Seal': string;
  '1% For The Planet': string;
  'Fair Labor Association': string;
  'Leaping Bunny Certified': string;
  'GOTS (Global Organic Textile Standard)': string;
  'BCI - Better Cotton Initiative': string;
  'Responsible Jewellery Council': string;
  'Fairtrade Federation': string;
  'World Fair Trade Organization': string;
  'Fairtrade International': string;
  'GoodWeave': string;
  'OCS (Organic Content Standard)': string;
  'Women Owned Directory': string;
  'Plant Based Foods Association': string;
  'Rainforest Alliance Certified': string;
  'RE100': string;
  'Ethical Trading Initiative(ETI)': string;
  'Leather Working Group(LWG)': string;
  'Slave Free Chocolate': string;
  'Sustainable Packaging Coalition': string;
  'American Humane Certified': string;
}

interface IRawCompanyJustCapitalDataSources {
  'justCapital_metric_Workforce Demographics': string;
  'justCapital_metric_Health and Safety Policies': string;
  'justCapital_metric_Local Employment Pipeline': string
  'justCapital_metric_Worker Benefits Package': string;
  'justCapital_metric_Human Rights Reporting': string;
  'justCapital_metric_Labor & Human Rights Commitment': string;
  'justCapital_metric_Work-Life Balance': string;
  'justCapital_metric_Actions to Support Human Rights Commitment': string;
  'justCapital_metric_Supplier Requirements on Labor & Human Rights': string;
  'justCapital_metric_Opportunities for Local Businesses': string;
  'justCapital_metric_Human Rights Supply Chain Safeguards': string;
  'justCapital_metric_Local School Support': string;
  'justCapital_metric_Related Party Transactions': string;
  'justCapital_metric_Board Diversity': string;
  'justCapital_metric_SEC Filings Review': string;
  'justCapital_metric_Commitment to Following Laws & Regulations': string;
  'justCapital_metric_Privacy Policies': string;
  'justCapital_metric_Sustainable Products and Services': string;
  'justCapital_metric_Local Community Engagement': string;
  'justCapital_metric_Scope 1 Plus 2 Greenhouse Gas Emissions': string;
  'justCapital_metric_Renewable Energy Percentage_0.5': string;
  'justCapital_metric_Renewable Energy Percentage_1': string;
  'justCapital_metric_Diversity, Equity, and Inclusion Policies': string;
  'justCapital_metric_Transparent Charitable Giving': string;
  'justCapital_metric_Resource Use': string;
  'justCapital_metric_Climate Commitments': string;
}

interface IRawCompanyBCorpDataSources {
  'bCorp_ia_community_it_civic_engagement_giving': string;
  'bCorp_ia_community_it_designed_to_give': string;
  'bCorp_ia_community_ia_community_it_diversity_equity_inclusion': string;
  'bCorp_ia_community_it_diversity_inclusion': string;
  'bCorp_ia_community_it_economic_impact': string;
  'bCorp_ia_community_it_job_creation': string;
  'bCorp_ia_community_it_local_economic_development': string;
  'bCorp_ia_community_it_local_involvement': string;
  'bCorp_ia_community_it_microdistribution_poverty_alleviation': string;
  'bCorp_ia_community_it_producer_cooperative': string;
  'bCorp_ia_community_it_suppliers_distributors_product': string;
  'bCorp_ia_community_it_supply_chain_management': string;
  'bCorp_ia_community_it_supply_chain_poverty_alleviation': string;
  'bCorp_ia_customers_it_arts_media_culture': string;
  'bCorp_ia_customers_it_basic_services_for_the_underserved': string;
  'bCorp_ia_customers_it_business_model_and_engagement': string;
  'bCorp_ia_customers_it_capacity_building': string;
  'bCorp_ia_customers_it_current_fund': string;
  'bCorp_ia_customers_it_customer_stewardship': string;
  'bCorp_ia_customers_it_economic_empowerment_for_the_underserved': string;
  'bCorp_ia_customers_it_education': string;
  'bCorp_ia_customers_it_educational_outcomes': string;
  'bCorp_ia_customers_it_fund_governance': string;
  'bCorp_ia_customers_it_health_wellness_improvement': string;
  'bCorp_ia_customers_it_impact_improvement': string;
  'bCorp_ia_customers_it_improved_impact': string;
  'bCorp_ia_customers_it_infrastructure_market_access_building': string;
  'bCorp_ia_customers_it_investment_criteria': string;
  'bCorp_ia_customers_it_leadership_outreach': string;
  'bCorp_ia_customers_it_mission_lock': string;
  'bCorp_ia_customers_it_past_performance': string;
  'bCorp_ia_customers_it_portfolio_management': string;
  'bCorp_ia_customers_it_portfolio_reporting': string;
  'bCorp_ia_customers_it_positive_impact': string;
  'bCorp_ia_customers_it_privacy_and_consumer_protection': string;
  'bCorp_ia_customers_it_quality_and_continuous_improvement': string;
  'bCorp_ia_customers_it_serving_in_need_populations': string;
  'bCorp_ia_customers_it_serving_underserved_populations_direct_': string;
  'bCorp_ia_customers_it_support_for_underserved_purpose_driven_enterprises': string;
  'bCorp_ia_customers_it_targeted_for_investment': string;
  'bCorp_ia_environment_it_air_climate': string;
  'bCorp_ia_environment_it_certification': string;
  'bCorp_ia_environment_it_community': string;
  'bCorp_ia_environment_it_designed_to_conserve_manufacturing_process': string;
  'bCorp_ia_environment_it_environmental_education_information': string;
  'bCorp_ia_environment_it_environmental_management': string;
  'bCorp_ia_environment_it_environmentally_innovative_manufacturing_process': string;
  'bCorp_ia_environment_it_environmentally_innovative_wholesale_process': string;
  'bCorp_ia_environment_it_green_lending': string;
  'bCorp_ia_environment_it_inputs': string;
  'bCorp_ia_environment_it_land_life': string;
  'bCorp_ia_environment_it_land_office_plant': string;
  'bCorp_ia_environment_it_land_wildlife_conservation': string;
  'bCorp_ia_environment_it_material_energy_use': string;
  'bCorp_ia_environment_it_materials_codes': string;
  'bCorp_ia_environment_it_outputs': string;
  'bCorp_ia_environment_it_renewable_or_cleaner_burning_energy': string;
  'bCorp_ia_environment_it_resource_conservation': string;
  'bCorp_ia_environment_it_toxin_reduction_remediation': string;
  'bCorp_ia_environment_it_training_collaboration': string;
  'bCorp_ia_environment_it_transportation_distribution_suppliers': string;
  'bCorp_ia_environment_it_water': string;
  'bCorp_ia_workers_it_worker_benefits': string;
  'bCorp_ia_workers_it_career_development': string;
  'bCorp_ia_workers_it_compensation_wages': string;
  'bCorp_ia_workers_it_engagement_satisfaction': string;
  'bCorp_ia_workers_it_financial_security': string;
  'bCorp_ia_workers_it_health_wellness_safety': string;
  'bCorp_ia_workers_it_job_flexibility_corporate_culture': string;
  'bCorp_ia_workers_it_management_worker_communication': string;
  'bCorp_ia_workers_it_occupational_health_safety': string;
  'bCorp_ia_workers_it_training_education': string;
  'bCorp_ia_workers_it_worker_owned': string;
  'bCorp_ia_workers_it_worker_ownership': string;
  'bCorp_ia_workers_it_workforce_development': string;
}

interface IRawCompanyDataSourceExpirations {
  'Expiration: SaferChoice': string;
  'Expiration: A List CDP - Climate Change': string;
  'Expiration: A List CDP - Water Security': string;
  'Expiration: A List CDP - Forests': string;
  'Expiration: Green Seal': string;
  'Expiration: 1% For The Planet': string;
  'Expiration: Fair Labor Association': string;
  'Expiration: Leaping Bunny Certified': string;
  'Expiration: GOTS (Global Organic Textile Standard)': string;
  'Expiration: BCI - Better Cotton Initiative': string;
  'Expiration: Responsible Jewellery Council': string;
  'Expiration: Fairtrade Federation': string;
  'Expiration: World Fair Trade Organization': string;
  'Expiration: Fairtrade International': string;
  'Expiration: GoodWeave': string;
  'Expiration: OCS (Organic Content Standard)': string;
  'Expiration: Women Owned Directory': string;
  'Expiration: Plant Based Foods Association': string;
  'Expiration: Rainforest Alliance Certified': string;
  'Expiration: RE100': string;
  'Expiration: Ethical Trading Initiative(ETI)': string;
  'Expiration: Leather Working Group(LWG)': string;
  'Expiration: Slave Free Chocolate': string;
  'Expiration: Sustainable Packaging Coalition': string;
  'Expiration: American Humane Certified': string;
}

interface IRawCompany2DataSourcesMapping extends IRawCompanyDataSources, IRawCompanyDataSourceExpirations {
  legacyId: string;
  companyName: string;
  primaryDataSource: string;
  parentCompanyId: string;
}

type DataSourceKeys = keyof IRawCompany2DataSourcesMapping;

const dataSourceNames: DataSourceKeys[] = [
  'SaferChoice',
  'A List CDP - Climate Change',
  'A List CDP - Water Security',
  'A List CDP - Forests',
  'Green Seal',
  '1% For The Planet',
  'Fair Labor Association',
  'Leaping Bunny Certified',
  'GOTS (Global Organic Textile Standard)',
  'BCI - Better Cotton Initiative',
  'Responsible Jewellery Council',
  'Fairtrade Federation',
  'World Fair Trade Organization',
  'Fairtrade International',
  'GoodWeave',
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

interface IRawCompany2JustCapitalMapping extends IRawCompanyJustCapitalDataSources {
  legacyId: string;
  companyName: string;
}

type JustCapitalDataSourceKeys = keyof IRawCompanyJustCapitalDataSources;

const justCapitalDataSourceNames: JustCapitalDataSourceKeys[] = [
  'justCapital_metric_Workforce Demographics',
  'justCapital_metric_Health and Safety Policies',
  'justCapital_metric_Local Employment Pipeline',
  'justCapital_metric_Worker Benefits Package',
  'justCapital_metric_Human Rights Reporting',
  'justCapital_metric_Labor & Human Rights Commitment',
  'justCapital_metric_Work-Life Balance',
  'justCapital_metric_Actions to Support Human Rights Commitment',
  'justCapital_metric_Supplier Requirements on Labor & Human Rights',
  'justCapital_metric_Opportunities for Local Businesses',
  'justCapital_metric_Human Rights Supply Chain Safeguards',
  'justCapital_metric_Local School Support',
  'justCapital_metric_Related Party Transactions',
  'justCapital_metric_Board Diversity',
  'justCapital_metric_SEC Filings Review',
  'justCapital_metric_Commitment to Following Laws & Regulations',
  'justCapital_metric_Privacy Policies',
  'justCapital_metric_Sustainable Products and Services',
  'justCapital_metric_Local Community Engagement',
  'justCapital_metric_Scope 1 Plus 2 Greenhouse Gas Emissions',
  'justCapital_metric_Renewable Energy Percentage_0.5',
  'justCapital_metric_Renewable Energy Percentage_1',
  'justCapital_metric_Diversity, Equity, and Inclusion Policies',
  'justCapital_metric_Transparent Charitable Giving',
  'justCapital_metric_Resource Use',
  'justCapital_metric_Climate Commitments',
];

interface IRawCompany2BCorpMapping extends IRawCompanyBCorpDataSources {
  legacyId: string;
  companyName: string;
}

type BCorpDataSourceKeys = keyof IRawCompanyBCorpDataSources;

const bCorpDataSourceNames: BCorpDataSourceKeys[] = [
  'bCorp_ia_community_it_civic_engagement_giving',
  'bCorp_ia_community_it_designed_to_give',
  'bCorp_ia_community_ia_community_it_diversity_equity_inclusion',
  'bCorp_ia_community_it_diversity_inclusion',
  'bCorp_ia_community_it_economic_impact',
  'bCorp_ia_community_it_job_creation',
  'bCorp_ia_community_it_local_economic_development',
  'bCorp_ia_community_it_local_involvement',
  'bCorp_ia_community_it_microdistribution_poverty_alleviation',
  'bCorp_ia_community_it_producer_cooperative',
  'bCorp_ia_community_it_suppliers_distributors_product',
  'bCorp_ia_community_it_supply_chain_management',
  'bCorp_ia_community_it_supply_chain_poverty_alleviation',
  'bCorp_ia_customers_it_arts_media_culture',
  'bCorp_ia_customers_it_basic_services_for_the_underserved',
  'bCorp_ia_customers_it_business_model_and_engagement',
  'bCorp_ia_customers_it_capacity_building',
  'bCorp_ia_customers_it_current_fund',
  'bCorp_ia_customers_it_customer_stewardship',
  'bCorp_ia_customers_it_economic_empowerment_for_the_underserved',
  'bCorp_ia_customers_it_education',
  'bCorp_ia_customers_it_educational_outcomes',
  'bCorp_ia_customers_it_fund_governance',
  'bCorp_ia_customers_it_health_wellness_improvement',
  'bCorp_ia_customers_it_impact_improvement',
  'bCorp_ia_customers_it_improved_impact',
  'bCorp_ia_customers_it_infrastructure_market_access_building',
  'bCorp_ia_customers_it_investment_criteria',
  'bCorp_ia_customers_it_leadership_outreach',
  'bCorp_ia_customers_it_mission_lock',
  'bCorp_ia_customers_it_past_performance',
  'bCorp_ia_customers_it_portfolio_management',
  'bCorp_ia_customers_it_portfolio_reporting',
  'bCorp_ia_customers_it_positive_impact',
  'bCorp_ia_customers_it_privacy_and_consumer_protection',
  'bCorp_ia_customers_it_quality_and_continuous_improvement',
  'bCorp_ia_customers_it_serving_in_need_populations',
  'bCorp_ia_customers_it_serving_underserved_populations_direct_',
  'bCorp_ia_customers_it_support_for_underserved_purpose_driven_enterprises',
  'bCorp_ia_customers_it_targeted_for_investment',
  'bCorp_ia_environment_it_air_climate',
  'bCorp_ia_environment_it_certification',
  'bCorp_ia_environment_it_community',
  'bCorp_ia_environment_it_designed_to_conserve_manufacturing_process',
  'bCorp_ia_environment_it_environmental_education_information',
  'bCorp_ia_environment_it_environmental_management',
  'bCorp_ia_environment_it_environmentally_innovative_manufacturing_process',
  'bCorp_ia_environment_it_environmentally_innovative_wholesale_process',
  'bCorp_ia_environment_it_green_lending',
  'bCorp_ia_environment_it_inputs',
  'bCorp_ia_environment_it_land_life',
  'bCorp_ia_environment_it_land_office_plant',
  'bCorp_ia_environment_it_land_wildlife_conservation',
  'bCorp_ia_environment_it_material_energy_use',
  'bCorp_ia_environment_it_materials_codes',
  'bCorp_ia_environment_it_outputs',
  'bCorp_ia_environment_it_renewable_or_cleaner_burning_energy',
  'bCorp_ia_environment_it_resource_conservation',
  'bCorp_ia_environment_it_toxin_reduction_remediation',
  'bCorp_ia_environment_it_training_collaboration',
  'bCorp_ia_environment_it_transportation_distribution_suppliers',
  'bCorp_ia_environment_it_water',
  'bCorp_ia_workers_it_worker_benefits',
  'bCorp_ia_workers_it_career_development',
  'bCorp_ia_workers_it_compensation_wages',
  'bCorp_ia_workers_it_engagement_satisfaction',
  'bCorp_ia_workers_it_financial_security',
  'bCorp_ia_workers_it_health_wellness_safety',
  'bCorp_ia_workers_it_job_flexibility_corporate_culture',
  'bCorp_ia_workers_it_management_worker_communication',
  'bCorp_ia_workers_it_occupational_health_safety',
  'bCorp_ia_workers_it_training_education',
  'bCorp_ia_workers_it_worker_owned',
  'bCorp_ia_workers_it_worker_ownership',
  'bCorp_ia_workers_it_workforce_development',
];

type DateSourceExpirationKeys = keyof IRawCompanyDataSourceExpirations;

// const dataSourceExpirationNames: DateSourceExpirationKeys[] = [
//   'Expiration: SaferChoice',
//   'Expiration: A List CDP - Climate Change',
//   'Expiration: A List CDP - Water Security',
//   'Expiration: A List CDP - Forests',
//   'Expiration: Green Seal',
//   'Expiration: 1% For The Planet',
//   'Expiration: Fair Labor Association',
//   'Expiration: Leaping Bunny Certified',
//   'Expiration: GOTS (Global Organic Textile Standard)',
//   'Expiration: BCI - Better Cotton Initiative',
//   'Expiration: Responsible Jewellery Council',
//   'Expiration: Fairtrade Federation',
//   'Expiration: World Fair Trade Organization',
//   'Expiration: Fairtrade International',
//   'Expiration: GoodWeave',
//   'Expiration: OCS (Organic Content Standard)',
//   'Expiration: Women Owned Directory',
//   'Expiration: Plant Based Foods Association',
//   'Expiration: Rainforest Alliance Certified',
//   'Expiration: RE100',
//   'Expiration: Ethical Trading Initiative(ETI)',
//   'Expiration: Leather Working Group(LWG)',
//   'Expiration: Slave Free Chocolate',
//   'Expiration: Sustainable Packaging Coalition',
//   'Expiration: American Humane Certified',
// ];

const createCompanyDataSourceMappings = async (
  company: ICompanyDocument,
  row: IRawCompany2DataSourcesMapping,
  dataSources: IDataSourceDocument[],
  inheritedCompanyDataSources: ICompanyDataSourceDocument[] = [],
) => {
  const newCompanyDataSources: { [key: string]: ICompanyDataSourceDocument } = {};

  for (const inheritedCompanyDataSource of inheritedCompanyDataSources) {
    newCompanyDataSources[(inheritedCompanyDataSource.source as IDataSourceDocument).name] = new CompanyDataSourceModel({
      company,
      source: inheritedCompanyDataSource.source,
      dateRange: inheritedCompanyDataSource.dateRange,
      isPrimary: inheritedCompanyDataSource.isPrimary,
    });
  }

  for (const dataSourceName of dataSourceNames) {
    if (!!row[dataSourceName]) {
      const dataSource = dataSources.find(d => d.name === dataSourceName);

      if (!dataSource) console.log(`[-] failed to find data source: ${dataSourceName}`);

      const key = `Expiration: ${dataSourceName}` as DateSourceExpirationKeys;
      const expirationStr = row[key];

      if (!expirationStr) console.log('>>>>> failed to find expiration for ', row.legacyId);

      const [month, date] = expirationStr.split('/');

      const timestamp = dayjs().utc().toDate();
      let expiration: Date;

      if (!!month && !!date) {
        expiration = dayjs().utc()
          .month(parseInt(month) - 1)
          .date(parseInt(date))
          .add(1, 'year')
          .toDate();
      }

      newCompanyDataSources[dataSourceName] = new CompanyDataSourceModel({
        company,
        source: dataSource,
        dateRange: {
          start: timestamp,
          end: expiration,
        },
        isPrimary: row.primaryDataSource === dataSource.name,
      });
    }
  }

  return Promise.all(Object.values(newCompanyDataSources).map(d => d.save()));
};

const createCompanyBCorpDataSourceMappings = async (
  company: ICompanyDocument,
  row: IRawCompany2BCorpMapping,
  dataSources: IDataSourceDocument[],
  inheritedCompanyDataSources: ICompanyDataSourceDocument[] = [],
) => {
  const newCompanyDataSources: { [key: string]: ICompanyDataSourceDocument } = {};

  for (const inheritedCompanyDataSource of inheritedCompanyDataSources) {
    newCompanyDataSources[(inheritedCompanyDataSource.source as IDataSourceDocument).name] = new CompanyDataSourceModel({
      company,
      source: inheritedCompanyDataSource.source,
      dateRange: inheritedCompanyDataSource.dateRange,
      isPrimary: inheritedCompanyDataSource.isPrimary,
    });
  }

  const expiration = dayjs('Dec 31, 2023').utc().toDate();
  let primaryDataSourceFound = false;

  for (const dataSourceName of bCorpDataSourceNames) {
    if (!!row[dataSourceName]) {
      const dataSource = dataSources.find(d => d.name === dataSourceName);

      if (!dataSource) continue;

      const timestamp = dayjs().utc().toDate();

      newCompanyDataSources[dataSourceName] = new CompanyDataSourceModel({
        company,
        source: dataSource,
        dateRange: {
          start: timestamp,
          end: expiration,
        },
        // the first data source used for company is to be marked as
        // the primary
        isPrimary: !primaryDataSourceFound,
      });

      primaryDataSourceFound = true;
    }
  }

  return Promise.all(Object.values(newCompanyDataSources).map(d => d.save()));
};

const createCompanyJustCapitalDataSourceMappings = async (
  company: ICompanyDocument,
  row: IRawCompany2JustCapitalMapping,
  dataSources: IDataSourceDocument[],
  inheritedCompanyDataSources: ICompanyDataSourceDocument[] = [],
) => {
  const newCompanyDataSources: { [key: string]: ICompanyDataSourceDocument } = {};

  for (const inheritedCompanyDataSource of inheritedCompanyDataSources) {
    newCompanyDataSources[(inheritedCompanyDataSource.source as IDataSourceDocument).name] = new CompanyDataSourceModel({
      company,
      source: inheritedCompanyDataSource.source,
      dateRange: inheritedCompanyDataSource.dateRange,
      isPrimary: inheritedCompanyDataSource.isPrimary,
    });
  }

  const expiration = dayjs('Dec 31, 2023').utc().toDate();
  let primaryDataSourceFound = false;

  for (const dataSourceName of justCapitalDataSourceNames) {
    if (!!row[dataSourceName]) {
      const dataSource = dataSources.find(d => d.name === dataSourceName);

      if (!dataSource) console.log(`[-] failed to find just capital data source: ${dataSourceName}`);

      const timestamp = dayjs().utc().toDate();

      newCompanyDataSources[dataSourceName] = new CompanyDataSourceModel({
        company,
        source: dataSource,
        dateRange: {
          start: timestamp,
          end: expiration,
        },
        // the first data source used for company is to be marked as
        // the primary
        isPrimary: !primaryDataSourceFound,
      });

      primaryDataSourceFound = true;
    }
  }

  return Promise.all(Object.values(newCompanyDataSources).map(d => d.save()));
};

const mapCompaniesToBCorpDataSources = async (
  companies: ICompanyDocument[],
  dataSources: IDataSourceDocument[],
  parentCompanyDataSourceMappings: ICompanyDataSourceDocument[] = [],
  nonParentCompanyDataSourceMappings: ICompanyDataSourceDocument[] = [],
) => {
  console.log(`\nmapping bcorp data sources to ${!!parentCompanyDataSourceMappings.length ? '' : 'parent '}companies...`);

  let rawData: IRawCompany2BCorpMapping[];

  try {
    rawData = await csvtojson().fromFile(path.resolve(__dirname, '.tmp', 'company_bcorp_mappings.csv'));
  } catch (err) {
    console.log('\n[-] error retrieving raw bcorp mapping data from csv');
    console.log(err, '\n');
  }

  if (!rawData) return;

  let count = 0;
  let errorCount = 0;

  const missingSourceNames = new Set<string>();

  for (const dataSourceName of bCorpDataSourceNames) {
    const dataSourceNameMatch = dataSources.find(ds => ds.name === dataSourceName);

    if (!dataSourceNameMatch) missingSourceNames.add(dataSourceName);
  }

  let companyDataSourceMappings: ICompanyDataSourceDocument[] = [];

  const parentsWithNoMappings = new Set<string>();

  for (const row of rawData) {
    if (!row.legacyId?.trim()) continue;

    try {
      const company = companies.find(c => c.legacyId.toString() === row.legacyId);
      if (!company) continue;

      const parentCompany = company.parentCompany as ICompanyDocument;
      let parentDataSourceMappings: ICompanyDataSourceDocument[] = [];

      if (!!parentCompany) {
        if (!nonParentCompanyDataSourceMappings.find(npcdsm => (npcdsm.company as ICompanyDocument)._id.toString() === company._id.toString())) {
          parentDataSourceMappings = parentCompanyDataSourceMappings.filter(pcdsm => (pcdsm.company as ICompanyDocument)._id.toString() === parentCompany._id.toString());

          if (!parentDataSourceMappings?.length) {
            parentsWithNoMappings.add(parentCompany._id.toString());
            continue;
          }
        }
      }

      const companyAlreadyMapped = !!companyDataSourceMappings.find(cdsm => (cdsm.company as ICompanyDocument)._id.toString() === company._id.toString());
      if (companyAlreadyMapped) continue;

      const dataSourceMappings = await createCompanyBCorpDataSourceMappings(company, row, dataSources, parentDataSourceMappings);
      companyDataSourceMappings = [...companyDataSourceMappings, ...dataSourceMappings];
      count += dataSourceMappings.length;
    } catch (err) {
      errorCount += 1;
      console.log(`[-] error mapping bcorp data sources to company: ${row.legacyId} - ${row.companyName}`);
      console.log(err);
    }
  }

  if (!!parentsWithNoMappings.size) console.log('[-] parent companies with no mappings: ', parentsWithNoMappings);
  if (errorCount > 0) console.log(`\n${errorCount} errors occurred while mapping just capital data sources to ${!!parentCompanyDataSourceMappings.length ? '' : 'parent '}companies`);
  console.log(`${count} bcorp data source to ${!!parentCompanyDataSourceMappings.length ? '' : 'parent '}company mappings were created\n`);

  return companyDataSourceMappings;
};

const mapCompaniesToJustCapitalDataSources = async (
  companies: ICompanyDocument[],
  dataSources: IDataSourceDocument[],
  parentCompanyDataSourceMappings: ICompanyDataSourceDocument[] = [],
  nonParentCompanyDataSourceMappings: ICompanyDataSourceDocument[] = [],
) => {
  console.log(`\nmapping just capital data sources to ${!!parentCompanyDataSourceMappings.length ? '' : 'parent '}companies...`);

  let rawData: IRawCompany2JustCapitalMapping[];

  try {
    rawData = await csvtojson().fromFile(path.resolve(__dirname, '.tmp', 'company_just_capital_mappings.csv'));
  } catch (err) {
    console.log('\n[-] error retrieving raw just capital mapping data from csv');
    console.log(err, '\n');
  }

  if (!rawData) return;

  let count = 0;
  let errorCount = 0;

  for (const dataSourceName of justCapitalDataSourceNames) {
    const dataSourceNameMatch = dataSources.find(ds => ds.name === dataSourceName);

    if (!dataSourceNameMatch) console.log('just capital data source name not found:', dataSourceName);
  }

  let companyDataSourceMappings: ICompanyDataSourceDocument[] = [];

  const parentsWithNoMappings = new Set<string>();

  for (const row of rawData) {
    if (!row.legacyId?.trim()) continue;

    try {
      const company = companies.find(c => c.legacyId.toString() === row.legacyId);
      if (!company) continue;

      const parentCompany = company.parentCompany as ICompanyDocument;
      let parentDataSourceMappings: ICompanyDataSourceDocument[] = [];

      if (!!parentCompany) {
        if (!nonParentCompanyDataSourceMappings.find(npcdsm => (npcdsm.company as ICompanyDocument)._id.toString() === company._id.toString())) {
          parentDataSourceMappings = parentCompanyDataSourceMappings.filter(pcdsm => (pcdsm.company as ICompanyDocument)._id.toString() === parentCompany._id.toString());

          if (!parentDataSourceMappings?.length) {
            parentsWithNoMappings.add(parentCompany._id.toString());
            continue;
          }
        }
      }

      const companyAlreadyMapped = companyDataSourceMappings.find(cdsm => (cdsm.company as ICompanyDocument)._id.toString() === company._id.toString());
      if (!!companyAlreadyMapped) continue;

      const dataSourceMappings = await createCompanyJustCapitalDataSourceMappings(company, row, dataSources, parentDataSourceMappings);
      companyDataSourceMappings = [...companyDataSourceMappings, ...dataSourceMappings];
      count += dataSourceMappings.length;
    } catch (err) {
      errorCount += 1;
      console.log(`[-] error mapping just capital data sources to company: ${row.legacyId} - ${row.companyName}`);
      console.log(err);
    }
  }

  if (!!parentsWithNoMappings.size) console.log('[-] parent companies with no mappings: ', parentsWithNoMappings);
  if (errorCount > 0) console.log(`\n${errorCount} errors occurred while mapping just capital data sources to ${!!parentCompanyDataSourceMappings.length ? '' : 'parent '}companies`);
  console.log(`${count} just capital data source to ${!!parentCompanyDataSourceMappings.length ? '' : 'parent '}company mappings were created\n`);

  return companyDataSourceMappings;
};

const mapCompanies2OtherDataSources = async (
  companies: ICompanyDocument[],
  dataSources: IDataSourceDocument[],
  parentCompanyDataSourceMappings: ICompanyDataSourceDocument[] = [],
  nonParentCompanyDataSourceMappings: ICompanyDataSourceDocument[] = [],
) => {
  console.log(`\nmapping "other" data sources to ${!!parentCompanyDataSourceMappings.length ? '' : 'parent '}companies...`);

  let rawData: IRawCompany2DataSourcesMapping[];

  try {
    rawData = await csvtojson().fromFile(path.resolve(__dirname, '.tmp', 'company_data_source_mappings.csv'));
  } catch (err) {
    console.log('\n[-] error retrieving raw "other" data source mapping data from csv');
    console.log(err, '\n');
  }

  if (!rawData) return;

  let count = 0;
  let errorCount = 0;

  for (const dataSourceName of dataSourceNames) {
    const dataSourceNameMatch = dataSources.find(ds => ds.name === dataSourceName);

    if (!dataSourceNameMatch && dataSourceName as string !== 'Just Capital' && dataSourceName as string !== 'B-Corp') console.log('data source name not found:', dataSourceName);
  }

  let companyDataSourceMappings: ICompanyDataSourceDocument[] = [];

  const parentsWithNoMappings = new Set<string>();

  for (const row of rawData) {
    try {
      const company = companies.find(c => c.legacyId.toString() === row.legacyId);
      if (!company) continue;

      const parentCompany = company.parentCompany as ICompanyDocument;
      let parentDataSourceMappings: ICompanyDataSourceDocument[] = [];

      if (!!parentCompany) {
        if (!nonParentCompanyDataSourceMappings.find(npcdsm => (npcdsm.company as ICompanyDocument)._id.toString() === company._id.toString())) {
          parentDataSourceMappings = parentCompanyDataSourceMappings.filter(pcdsm => (pcdsm.company as ICompanyDocument)._id.toString() === parentCompany._id.toString());

          if (!parentDataSourceMappings?.length) {
            parentsWithNoMappings.add(parentCompany._id.toString());
            continue;
          }
        }
      }

      const companyAlreadyMapped = companyDataSourceMappings.find(cdsm => (cdsm.company as ICompanyDocument)._id.toString() === company._id.toString());
      if (!!companyAlreadyMapped) continue;

      const dataSourceMappings = await createCompanyDataSourceMappings(company, row, dataSources, parentDataSourceMappings);
      companyDataSourceMappings = [...companyDataSourceMappings, ...dataSourceMappings];
      count += dataSourceMappings.length;
    } catch (err) {
      errorCount += 1;
      console.log(`[-] error mapping data sources for company: ${row.legacyId} - ${row.companyName}`);
      console.log(err);
    }
  }

  if (!!parentsWithNoMappings.size) console.log('[-] parent companies with no mappings: ', parentsWithNoMappings);
  if (errorCount > 0) console.log(`\n${errorCount} errors occurred while mapping "other" data sources to ${!!parentCompanyDataSourceMappings.length ? '' : 'parent '}companies`);
  console.log(`${count} "other" data source to ${!!parentCompanyDataSourceMappings.length ? '' : 'parent '}company mappings were created\n`);

  return companyDataSourceMappings;
};

export const mapCompanies2DataSources = async () => {
  let parentCompanies: ICompanyDocument[];
  let nonParentCompanies: ICompanyDocument[];

  let dataSources: IDataSourceDocument[];

  try {
    console.log('\nretrieving all companies...');
    const c = await CompanyModel.aggregate([
      {
        $match: { parentCompany: { $ne: null } },
      },
      {
        $group: {
          _id: 0,
          parentCompanies: { $push: '$parentCompany' },
        },
      },
      {
        $project: { _id: 0, parentCompanies: 1 },
      },
    ]);

    parentCompanies = await CompanyModel.find({ _id: { $in: c[0].parentCompanies } });
    nonParentCompanies = await CompanyModel.find({ _id: { $nin: c[0].parentCompanies } });

    console.log('[+] all companies retrieved successfully\n');

    console.log('retrieving all data sources...');
    dataSources = await DataSourceModel.find({});
    console.log('[+] data sources retreived successfully\n');
  } catch (err) {
    console.log('[-] error retrieving companies and data sources');
    console.log(err);
  }

  if (!parentCompanies || !nonParentCompanies || !dataSources) return;

  // map data sources to parent companies first
  let allParentCompanyMappings = await mapCompaniesToJustCapitalDataSources(parentCompanies, dataSources);
  allParentCompanyMappings = [...allParentCompanyMappings, ...await mapCompaniesToBCorpDataSources(parentCompanies, dataSources)];
  allParentCompanyMappings = [...allParentCompanyMappings, ...await mapCompanies2OtherDataSources(parentCompanies, dataSources)];

  // then map data souces to non-parent companies so any
  // child companies can inherit all of a parent's data
  // sources
  let allNonParentCompanyMappings: ICompanyDataSourceDocument[] = [];
  allNonParentCompanyMappings = await mapCompaniesToJustCapitalDataSources(nonParentCompanies, dataSources, allParentCompanyMappings, allNonParentCompanyMappings);
  allNonParentCompanyMappings = [...allNonParentCompanyMappings, ...await mapCompaniesToBCorpDataSources(nonParentCompanies, dataSources, allParentCompanyMappings, allNonParentCompanyMappings)];
  allNonParentCompanyMappings = [...allNonParentCompanyMappings, ...await mapCompanies2OtherDataSources(nonParentCompanies, dataSources, allParentCompanyMappings, allNonParentCompanyMappings)];

  const total = allParentCompanyMappings.length + allNonParentCompanyMappings.length;
  console.log(`\n[+] ${total} total data sources mapped to companies\n`);
};
