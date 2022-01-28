import { api, error } from '../services/output';
import { ErrorTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import Company from '../services/company';
import { IRequestHandler } from '../types/request';

export const listCompanies: IRequestHandler = async (req, res) => {
  const isValid = true;
  if (!isValid) {
    error(req, res, new CustomError('Invalid input', ErrorTypes.INVALID_ARG));
    return;
  }
  const data = await Company.listCompanies(req);
  api(req, res, data);
};
