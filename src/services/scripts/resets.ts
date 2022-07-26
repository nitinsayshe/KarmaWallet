// removes any companies that have been created

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CompanyModel } from '../../models/company';
import { DataSourceModel } from '../../models/dataSource';
import { DataSourceMappingModel } from '../../models/dataSourceMapping';

dayjs.extend(utc);

export const resetNewCompanies = async (pastNHours = 24) => {
  console.log('resetting new companies...');

  const timestamp = dayjs().utc().subtract(pastNHours, 'hours').toDate();

  try {
    await CompanyModel.deleteMany({ createdAt: { $gte: timestamp } });
    console.log('[+] new companies reset');
  } catch (err) {
    console.log('[-] error resetting new companies');
    console.log(err);
  }
};

export const resetNewDataSources = async (pastNHours = 24) => {
  console.log('resetting new data sources...');

  const timestamp = dayjs().utc().subtract(pastNHours, 'hours').toDate();

  try {
    const dataSources = await DataSourceModel.find({ createdAt: { $gte: timestamp } });
    await DataSourceModel.deleteMany({ createdAt: { $gte: timestamp } });
    await DataSourceMappingModel.deleteMany({ source: { $in: dataSources } });
    console.log('[+] new data sources reset');
  } catch (err) {
    console.log('[-] error resetting new data sources');
    console.log(err);
  }
};
