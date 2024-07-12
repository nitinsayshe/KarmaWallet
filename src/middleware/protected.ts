import { error } from '../services/output';
import { ErrorTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import { IRequestHandler } from '../types/request';
import { Logger } from '../services/logger';
import { UserGroupModel } from '../models/userGroup';
import { IGroup } from '../models/group';
import { IMarqetaUserStatus } from '../integrations/marqeta/user/types';

export interface IProtectRouteRequirements {
  roles?: string[]; // role names
  groups?: string[]; // group ids
  marqetaStatus?: IMarqetaUserStatus[];
}

const protectedRequirements = (requirements: IProtectRouteRequirements): IRequestHandler => async (req, res, next) => {
  const { requestor } = req;

  if (!requestor) {
    Logger.error(new CustomError('no requestor', ErrorTypes.AUTHENTICATION));
    error(req, res, new CustomError('Access denied.', ErrorTypes.AUTHENTICATION));
    return;
  }

  if (!!requirements.roles?.length && !requirements.roles.find(r => requestor.role === r)) {
    Logger.error(new CustomError('roles do not match', ErrorTypes.AUTHENTICATION));
    error(req, res, new CustomError('Access denied.', ErrorTypes.AUTHENTICATION));
    return;
  }

  if (!!requirements.groups?.length) {
    const userGroups = await UserGroupModel.find({ user: req.requestor._id });

    if (!requirements.groups.find(g => userGroups.find(userGroup => (userGroup.group as IGroup).name === g))) {
      Logger.error(new CustomError('groups do not match', ErrorTypes.AUTHENTICATION));
      error(req, res, new CustomError('Access denied.', ErrorTypes.AUTHENTICATION));
      return;
    }
  }

  if (!!requirements.marqetaStatus?.length && !requirements.marqetaStatus.find(s => requestor.integrations?.marqeta?.status === s)) {
    Logger.error(new CustomError('Marqeta status is not permitted', ErrorTypes.AUTHENTICATION));
    error(req, res, new CustomError('Access denied.', ErrorTypes.AUTHENTICATION));
    return;
  }

  next();
};

export default protectedRequirements;
