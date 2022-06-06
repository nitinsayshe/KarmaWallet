import path from 'path';
import csvtojson from 'csvtojson';
import { DataSourceModel } from '../../models/dataSource';

interface IRawDataSource {
  name: string;
  url: string;
  notes: string;
}

export const createDataSources = async () => {
  console.log('\ncreating new data sources...');
  const rawData: IRawDataSource[] = await csvtojson().fromFile(path.resolve(__dirname, '.tmp', 'data_source_mappings.csv'));
  let count = 0;
  let errorCount = 0;

  for (const row of rawData) {
    try {
      let dataSource = await DataSourceModel.findOne({ name: row.name });

      // data source names must be unique...if data source
      // already exists with this name, do not continue...
      if (!!dataSource) continue;

      dataSource = new DataSourceModel({
        name: row.name,
        url: row.url,
        notes: row.notes,
      });

      await dataSource.save();
      count += 1;
    } catch (err) {
      errorCount += 1;
      console.log('\n[-] error creating data source: ', row.name);
      console.log(err);
    }
  }

  if (errorCount > 0) {
    if (count > 0) {
      console.log(`\n[-] ${count} data sources created but with ${errorCount} errors\n`);
    } else {
      console.log(`\n[-] ${errorCount} errors occurred while creating the data sources\n`);
    }
  } else if (count === 0) {
    console.log('\n[*] No data sources were created\n');
  } else {
    console.log(`\n[+] ${count} data sources created successfully\n`);
  }
};
