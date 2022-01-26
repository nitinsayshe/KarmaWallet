import { Request, Response, NextFunction } from 'express';
import { IUser } from '../mongo/model/user';

export interface IRequest extends Request {
  requestor?: IUser;
  authKey?: string;
}

export type IRequestHandler = (req: IRequest, res: Response, next: NextFunction) => void
