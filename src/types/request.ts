import { Request, Response, NextFunction } from 'express-serve-static-core';
import { IAppDocument } from '../models/app';
import { IUserDocument } from '../models/user';

/**
 * adds:
 *  - requestor
 *  - authKey
 *  - appId
 *  to the request object.
 *  generic type allows specifying what type the params, query, and body will be.
 */
export interface IRequest<P = {}, Q = {}, B = {}> extends Request {
  params: P;
  query: Q;
  body: B;
  requestor?: IUserDocument;
  apiRequestor?: IAppDocument;
  authKey?: string;
  identifierKey?:string;
  headers: any;
  get: any
}

/**
 * a request handler that replaces express.Request
 * as this uses the IRequest object instead.
 */
export type IRequestHandler<P = {}, Q = {}, B = {}> = (
  req: IRequest<P, Q, B>,
  res: Response,
  next?: NextFunction
) => void;
