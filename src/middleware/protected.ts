import { Response, NextFunction } from 'express';
import { error } from '../services/output';
import { ErrorTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import { IRequest } from '../types/request';

export interface IProtectRouteRequirements {
  roles?: string[];
  groups?: string[];
}

const protectedRequirements = (requirements: IProtectRouteRequirements) => async (req: IRequest, res: Response, next: NextFunction) => {
  const { requestor } = req;

  if (!requestor) {
    console.log('>>>>> !requestor');
    error(req, res, new CustomError('Access denied.', ErrorTypes.AUTHENTICATION));
    return;
  }

  if (!!requirements.roles?.length && !requirements.roles.find(r => requestor.role === r)) {
    console.log('>>>>> roles dont match');
    error(req, res, new CustomError('Access denied.', ErrorTypes.AUTHENTICATION));
    return;
  }

  if (!!requirements.groups?.length && !requirements.groups.find(g => requestor.groups.find(rg => rg.group.name === g))) {
    console.log('>>>>> groups dont match');
    error(req, res, new CustomError('Access denied.', ErrorTypes.AUTHENTICATION));
    return;
  }

  next();
};

export default protectedRequirements;
