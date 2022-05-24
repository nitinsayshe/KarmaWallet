import { ErrorTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import { error } from '../services/output';
import { IRequestHandler } from '../types/request';

const checkToken: IRequestHandler = (req, res, next) => {
  console.log('>>>>> req', req.url);
  if (req.headers['plaid-verification'] && req.route.path === '/webhook/plaid') {
    return next();
  }

  const token = req.headers.authorization;
  if (!token || token.replace('Bearer ', '') !== process.env.PUBLIC_TOKEN) {
    error(req, res, new CustomError('Access denied. Invalid token.', ErrorTypes.AUTHENTICATION));
    return;
  }
  return next();
};

export default checkToken;
