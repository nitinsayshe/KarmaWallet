import pino from 'pino';
import CustomError from '../../lib/customError';
import { IRequest } from '../../types/request';

/**
 * a single location to manage logging throughout the app
 */
class _Logger {
  private _logger: pino.Logger = null;

  constructor() {
    this._logger = pino();
    // TODO: add logging service config
  }

  info = (msg: string, req?: IRequest) => {
    // TODO: add logging to log service
    const mergingObject = {
      uid: req?.requestor?._id,
    };

    this._logger.info(mergingObject, msg);
  };

  error = (err: CustomError, req?: IRequest) => {
    // TODO: add logging to log service
    const mergingObject = {
      uid: req?.requestor?._id,
      errorType: `${err.data.name} Error`,
    };

    this._logger.error(mergingObject, err.message);
  };
}

export const Logger = new _Logger();
