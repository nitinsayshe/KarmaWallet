import {
  Request,
  Response,
  NextFunction,
} from 'express';
import { IUser } from '../mongo/model/user';

export interface IRequest<P = {}, Q = {}, B = {}> extends Request {
  params: P,
  query: Q;
  body: B;
  requestor?: IUser;
  authKey?: string;
}

export type IRequestHandler<P = {}, Q = {}, B = {}> = (req: IRequest<P, Q, B>, res: Response, next: NextFunction) => void
