import aqp from 'api-query-params';
import * as output from '../../services/output';
import { IRequestHandler } from '../../types/request';
import CustomError, { asCustomError } from '../../lib/customError';
import * as AccessControlService from '../../services/accessControl';
import { ErrorTypes, UserRoles } from '../../lib/constants';

interface IUpdateUserRoleBody {
  userId: string;
  role: UserRoles;
}

export const getAssignableRoles: IRequestHandler = (req, res) => {
  try {
    const assignableRoles = AccessControlService.getAssignableRoles(req);
    output.api(req, res, assignableRoles);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getSummary: IRequestHandler = async (req, res) => {
  try {
    const summary = await AccessControlService.getSummary(req);
    output.api(req, res, summary);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getUsers: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const users = await AccessControlService.getUsers(req, query);
    output.api(req, res, users);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateUserRole: IRequestHandler<{}, {}, IUpdateUserRoleBody> = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId) return output.error(req, res, new CustomError('A userId is requred.', ErrorTypes.INVALID_ARG));
    if (!role) output.error(req, res, new CustomError('A role is requred.', ErrorTypes.INVALID_ARG));

    const result = await AccessControlService.updateUserRole(req, userId, role);
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
