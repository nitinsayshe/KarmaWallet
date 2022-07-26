import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { DataSourceModel } from '../../models/dataSource';

dayjs.extend(utc);

export const addCreatedAtToDataSources = async () => {
  console.log('adding created at to data sources...');

  const dataSources = await DataSourceModel.find({});
  let count = 0;

  const timestamp = dayjs('Jan 1, 2022').utc().toDate();

  for (const dataSource of dataSources) {
    try {
      dataSource.createdAt = timestamp;

      await dataSource.save();
      count += 1;
    } catch (err) {
      console.log(`[-] error adding createdAt to data source: ${dataSource._id}`);
      console.log(err, '\n');
    }
  }

  console.log(`[+] ${count}/${dataSources.length} data sources updated`);
};
