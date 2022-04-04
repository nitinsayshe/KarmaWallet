import * as UploadService from '../../services/upload';
import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import { asCustomError } from '../../lib/customError';

export const uploadCsv: IRequestHandler<{}, {}, UploadService.ICsvUploadBody> = async (req, res) => {
  try {
    const csvUploadData = await UploadService.uploadCsv(req);
    output.api(req, res, csvUploadData);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
