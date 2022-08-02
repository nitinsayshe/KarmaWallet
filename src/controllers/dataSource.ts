import { IRequestHandler } from '../types/request';
import * as DataSourceService from '../services/dataSources';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';

export const getDataSources: IRequestHandler<{}, DataSourceService.IGetDataSourcesQuery> = async (req, res) => {
  try {
    const dataSources = await DataSourceService.getDataSources(req);
    output.api(req, res, dataSources.map(dataSource => DataSourceService.getShareableDataSource(dataSource)));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
