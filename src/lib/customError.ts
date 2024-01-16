import { ErrorTypes, IErrorType } from './constants';

class CustomError extends Error {
  isCustomError = true;
  data: any;

  constructor(msg: string, data?: any) {
    super(msg);
    this.data = data || ErrorTypes.GEN;
  }
}

export const asCustomError = (err: any, code?: IErrorType) => {
  let error;

  if (err.isCustomError) {
    error = err;
  } else if (err.errors) {
    error = new CustomError(err.errors[Object.keys(err.errors)[0]], ErrorTypes.INVALID_ARG);
  } else if (typeof err === 'string') {
    error = new CustomError(err, code);
  } else if (err.config) {
    error = new CustomError(err.response.data.error_message, ErrorTypes.SERVER);
  } else {
    error = new CustomError(err.message, code);
  }
  return error;
};

export default CustomError;
