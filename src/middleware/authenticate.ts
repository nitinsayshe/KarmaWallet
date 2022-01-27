import { ErrorTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import { error } from '../services/output';
import { IRequestHandler } from '../types/request';

const authenticate: IRequestHandler = async (req, res, next) => {
  if (!req.requestor) {
    error(req, res, new CustomError('Authentication failed.', ErrorTypes.AUTHENTICATION));
    return;
  }
  next();
};

export default authenticate;
