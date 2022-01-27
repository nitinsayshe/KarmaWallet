import * as UnsdgService from '../services/unsdgs';
import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';

export const getUnsdgs: IRequestHandler = async (req, res) => {
  try {
    const result = await UnsdgService.getUnsdgs();
    api(req, res, result);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
