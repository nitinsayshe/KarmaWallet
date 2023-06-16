import { api, error } from '../../services/output';
import { asCustomError } from '../../lib/customError';
import { IRequestHandler } from '../../types/request';
import * as UtilitiesService from '../../services/utilities';

export const validateHtml: IRequestHandler<{}, {}, UtilitiesService.IValidateHtmlBody> = async (req, res) => {
  try {
    const result = await UtilitiesService.validateHtml(req);
    api(req, res, result);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
