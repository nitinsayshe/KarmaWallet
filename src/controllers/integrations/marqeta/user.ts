import { IMarqetaCreateUser } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as UserService from '../../../integrations/marqeta/user';
import { ErrorTypes } from '../../../lib/constants';

export const createUser: IRequestHandler<{}, {}, IMarqetaCreateUser> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['first_name', 'last_name', 'email', 'birth_date', 'address1', 'city', 'state', 'country', 'postal_code'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const data = await UserService.createUser(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listUser: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const data = await UserService.listUsers();
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
