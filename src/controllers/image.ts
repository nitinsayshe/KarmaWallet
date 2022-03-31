import { asCustomError } from '../lib/customError';
import * as output from '../services/output';
import * as ImageService from '../services/image';
import { IRequestHandler } from '../types/request';

export const uploadImage: IRequestHandler<{}, {}, ImageService.IUploadImageRequestBody> = async (req, res) => {
  try {
    const imageUploadData = await ImageService.uploadImage(req);
    output.api(req, res, imageUploadData);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
