import { Response } from 'express-serve-static-core';
import { AUTHKEY_HEADER, DEVICE_IDENTIFIER, TOKEN_REMOVE } from '../lib/constants';
import CustomError from '../lib/customError';
import { IRequest } from '../types/request';
import { Logger } from './logger';

const setAuthHeader = (req: IRequest, res: Response, tkn?: string, Itkn?:string) => {
  const token = tkn || req.get(AUTHKEY_HEADER);
  const deviceToken = Itkn || req.get(DEVICE_IDENTIFIER);

  if (token === TOKEN_REMOVE) {
    res.removeHeader(AUTHKEY_HEADER);
  } else {
    const headers: { [key: string]: string } = {
      [AUTHKEY_HEADER]: token,
    };

    if (deviceToken) {
      headers[DEVICE_IDENTIFIER] = deviceToken;
    }

    res.header(headers);
  }
};

export const api = (req: IRequest, res: Response, data: any, authToken = '', code = 200, deviceToken = '') => {
  setAuthHeader(req, res, authToken, deviceToken);
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Expose-Headers', 'authKey, identifierKey');
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
