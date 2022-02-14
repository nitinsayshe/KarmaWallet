import * as UnsdgService from '../services/unsdgs';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';

export const getUnsdgs: IRequestHandler = async (req, res) => {
  try {
    const result = await UnsdgService.getUnsdgs();
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
