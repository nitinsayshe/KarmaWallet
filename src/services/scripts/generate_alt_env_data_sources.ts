import fs from 'fs';
import path from 'path';
import { DataSourceModel } from '../../models/dataSource';

export const generateAltEnvDataSources = async () => {
  const dataSources = await DataSourceModel.find({});

  const altEnvDataSources = dataSources.map(dataSource => ({
    dataSourceName: dataSource.name,
    dataSourceId: dataSource._id,
  }));

  fs.writeFileSync(path.join(__dirname, '.tmp', 'alt-data-sources.json'), JSON.stringify(altEnvDataSources));
};
