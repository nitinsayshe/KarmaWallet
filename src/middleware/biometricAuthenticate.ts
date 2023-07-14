import { Request, Response, NextFunction } from 'express-serve-static-core';
import { IRequest } from '../types/request';
import { ErrorTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import { error } from '../services/output';

const biometricAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  const identifierKey = req.header?.('identifierKey');

  if (req.body?.biometricSignature && !identifierKey) {
    error(req, res, new CustomError('Biometric Authentication failed.', ErrorTypes.AUTHENTICATION));
    return;
  }
  (req as IRequest).identifierKey = identifierKey;

  return next();
};

export default biometricAuthenticate;
