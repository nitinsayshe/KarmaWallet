import { IDataSourceDocument } from '../../models/dataSource';

export const getShareableDataSource = ({
  _id,
  name,
  url,
  integrations,
}: IDataSourceDocument) => ({
  _id,
  name,
  url,
  integrations,
});
