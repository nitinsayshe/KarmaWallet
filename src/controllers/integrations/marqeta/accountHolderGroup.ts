import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as ACHGroupService from '../../../integrations/marqeta/accountHolderGroup';
import { ErrorTypes } from '../../../lib/constants';
import { IMarqetaACHGroup } from '../../../integrations/marqeta/user/types';

export const createACHGroup: IRequestHandler<{}, {}, IMarqetaACHGroup> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['name'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { data } = await ACHGroupService.createACHGroup(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listACHGroup: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const { data } = await ACHGroupService.listACHGroup();
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getACHGroup: IRequestHandler<{accountGroupToken:string}, {}, {}> = async (req, res) => {
  try {
    const { accountGroupToken } = req.params;
    const { data } = await ACHGroupService.getACHGroup(accountGroupToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateACHGroup: IRequestHandler<{accountGroupToken:string}, {}, IMarqetaACHGroup> = async (req, res) => {
  try {
    const { data } = await ACHGroupService.updateACHGroup(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
