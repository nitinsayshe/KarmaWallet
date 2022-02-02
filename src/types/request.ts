import {
  Request,
  Response,
  NextFunction,
} from 'express-serve-static-core';
import { IUserDocument } from '../models/user';

/**
 * adds requestor and authKey to the request
 * object. generic type allows specifying
 * what type the params, query, and body
 * will be.
 */
export interface IRequest<P = {}, Q = {}, B = {}> extends Request {
  params: P,
  query: Q;
  body: B;
  requestor?: IUserDocument;
  authKey?: string;
}

/**
 * a request handler that replaces express.Request
 * as this uses the IRequest object instead.
 */
export type IRequestHandler<P = {}, Q = {}, B = {}> = (req: IRequest<P, Q, B>, res: Response, next: NextFunction) => void
