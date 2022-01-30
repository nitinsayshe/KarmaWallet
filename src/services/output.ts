import { Response } from 'express-serve-static-core';
import { AUTHKEY_HEADER, TOKEN_REMOVE } from '../lib/constants';
import CustomError from '../lib/customError';
import { IRequest } from '../types/request';
import { Logger } from './logger';

const setAuthHeader = (req: IRequest, res: Response, tkn?: string) => {
  const token = tkn || req.get(AUTHKEY_HEADER);

  if (token === TOKEN_REMOVE) {
    res.removeHeader(AUTHKEY_HEADER);
  } else if (token) {
    res.header(AUTHKEY_HEADER, token);
  }
};

export const api = (req: IRequest, res: Response, data: any, authToken = '', code = 200) => {
  setAuthHeader(req, res, authToken);
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Expose-Headers', 'authKey');
  res.statusCode = code;
  res.send(data);
};

export const error = (req: IRequest, res: Response, customError: CustomError, authToken = '') => {
  Logger.error(customError, req);
  setAuthHeader(req, res, authToken);
  res.set('Content-Type', 'application/json');
  res.statusCode = customError?.data?.code || 400;
  res.send({
    message: customError.message,
  });
};

export default { api, error };
