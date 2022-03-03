import * as GroupService from '../services/groups';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';

export const getGroup: IRequestHandler = async (req, res) => {
  try {
    const group = await GroupService.getGroup(req);
    output.api(req, res, GroupService.getShareableGroup(group));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createGroup: IRequestHandler<{}, {}, GroupService.ICreateGroupRequest> = async (req, res) => {
  try {
    const group = await GroupService.createGroup(req);
    output.api(req, res, GroupService.getShareableGroup(group));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const joinGroup: IRequestHandler<{}, {}, GroupService.IJoinGroupRequest> = async (req, res) => {
  try {
    const userGroup = await GroupService.joinGroup(req);
    output.api(req, res, GroupService.getShareableUserGroup(userGroup));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
