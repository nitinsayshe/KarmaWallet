import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as DataService from '../../services/data';
import { asCustomError } from '../../lib/customError';

export const cleanCompany: IRequestHandler = async (req, res) => {
  try {
    const result = await DataService.cleanCompany(req);
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
