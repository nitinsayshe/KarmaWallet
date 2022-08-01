import csv from 'csvtojson';
import fs from 'fs';
import { DataSourceModel } from '../../models/dataSource';

export const updateDataSourcesFromCsv = async () => {
  const errors = [];
  const dataSourcesJson = await csv().fromFile('./dataSourcesWithLogos.csv');
  for (const dataSource of dataSourcesJson) {
    try {
      const { Name: name, NOTE: notes, ID: _id, Description: description, Rank: _rank } = dataSource;
      const rank = parseInt(_rank, 10);
      const logoUrl = dataSource['Logo URL'];
      // FIRST SCENARIO: NEW DATA SOURCE
      if (!_id) {
        console.log('\ncreating new data source:', name);
        const newDataSource = {
          name,
          notes,
          description,
          logoUrl,
          rank,
        };
        const dataSourceInstance = new DataSourceModel(newDataSource);
        await dataSourceInstance.save();
        console.log('\ncreated new data source:', name);
        continue;
      } else {
        const existingDataSource = await DataSourceModel.findOne({ _id });
        const { notes: _notes } = existingDataSource;
        // SECOND SCENARIO: HIDE DATA SOURCE
        if (notes === 'HIDE, not in use') {
          console.log('\nhiding data source', name);
          existingDataSource.hidden = true;
          existingDataSource.notes = `${_notes}; ${notes}`;
          await existingDataSource.save();
          console.log('\nhid data source', name);
          continue;
        }
        // THIRD SCENARIO: UPDATE DATA SOURCE
        console.log('\nupdating data source', name);
        existingDataSource.logoUrl = logoUrl;
        existingDataSource.notes = `${_notes}; ${notes}`;
        existingDataSource.rank = rank;
        existingDataSource.description = description;
        await existingDataSource.save();
        console.log('\nupdated data source', name);
      }
    } catch (err) {
      errors.push({ error: err, dataSource });
    }
  }
  fs.writeFileSync('./dataSourceUpdateErrors.csv', JSON.stringify(errors, null, 2));
  console.log('updating data sources from csv...');
};
