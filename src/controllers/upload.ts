import { asCustomError } from '../lib/customError';
import * as output from '../services/output';
import * as UploadService from '../services/upload';
import { IRequestHandler } from '../types/request';

export const uploadImage: IRequestHandler<{}, {}, UploadService.IUploadImageRequestBody> = async (req, res) => {
  try {
    const imageUploadData = await UploadService.uploadImage(req);
    output.api(req, res, imageUploadData);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const uploadCsv: IRequestHandler<{}, {}, UploadService.ICsvUploadBody> = async (req, res) => {
  try {
    const csvUploadData = await UploadService.uploadCsv(req);
    output.api(req, res, csvUploadData);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
