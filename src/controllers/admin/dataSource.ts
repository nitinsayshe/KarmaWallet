import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as DataSourceService from '../../services/dataSources';
import { asCustomError } from '../../lib/customError';
import { BatchCSVUploadType, uploadBatchCsv } from '../../services/upload';

export const createBatchedDataSources: IRequestHandler = async (req, res) => {
  try {
    const uploadResult = await uploadBatchCsv(req, BatchCSVUploadType.DataSources);
    const result = await DataSourceService.createBatchedDataSources({ ...req, body: { fileUrl: uploadResult.url } });
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
