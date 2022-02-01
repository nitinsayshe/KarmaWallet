import { error } from '../services/output';
import { ErrorTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import { IRequestHandler } from '../types/request';
import { Logger } from '../services/logger';
import { IGroup } from '../models/group';

export interface IProtectRouteRequirements {
  roles?: string[];
  groups?: string[];
}

const protectedRequirements = (requirements: IProtectRouteRequirements): IRequestHandler => (req, res, next) => {
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

  if (!!requirements.groups?.length && !requirements.groups.find(g => requestor.groups.find(rg => (rg.group as IGroup).name === g))) {
    Logger.error(new CustomError('groups do not match', ErrorTypes.AUTHENTICATION));
    error(req, res, new CustomError('Access denied.', ErrorTypes.AUTHENTICATION));
    return;
  }

  next();
};

export default protectedRequirements;
