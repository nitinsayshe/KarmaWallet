import pino from 'pino';
import CustomError from '../../lib/customError';
import { IRequest } from '../../types/request';

class _Logger {
  private _logger: pino.Logger = null;

  constructor() {
    console.log('creating new Logger');

    this._logger = pino();
    // TODO: add logging service config
  }

  info = (msg: string, req?: IRequest) => {
    // TODO: add logging to log service
    this._logger.info(`\n${!!req?.requestor ? ` - uid: ${req.requestor}` : ''}\n${msg}\n`);
  };

  error = (err: CustomError, req?: IRequest) => {
    // TODO: add logging to log service
    const userId = !!req?.requestor ? ` - uid: ${req.requestor}` : '';
    const errorMessage = `${err.name} Error${userId}`;
    this._logger.error(err, errorMessage);
  };
}

export const Logger = new _Logger();
