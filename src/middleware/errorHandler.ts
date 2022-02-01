import { Request, Response, NextFunction } from 'express-serve-static-core';
import { asCustomError } from '../lib/customError';
import { error } from '../services/output';

export default (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) next(err);
  return error(req, res, asCustomError(err));
};
