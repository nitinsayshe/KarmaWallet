import aqp from 'api-query-params';
import * as GroupService from '../services/groups';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import { IGroupDocument } from '../models/group';

export const checkCode: IRequestHandler<{}, GroupService.ICheckCodeRequest> = async (req, res) => {
  try {
    const codeStatus = await GroupService.checkCode(req);
    output.api(req, res, codeStatus);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getGroup: IRequestHandler = async (req, res) => {
  try {
    const group = await GroupService.getGroup(req);
    output.api(req, res, GroupService.getShareableGroup(group));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getGroupMembers: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const groupMembers = await GroupService.getGroupMembers(req, query);
    output.api(req, res, {
      ...groupMembers,
      docs: groupMembers.docs.map(member => GroupService.getShareableGroupMember(member)),
    });
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getGroups: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const groups = await GroupService.getGroups(req, query);
    const sharableGroups = {
      ...groups,
      docs: groups.docs.map((g: IGroupDocument) => GroupService.getShareableGroup(g)),
    };

    output.api(req, res, sharableGroups);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getUserGroups: IRequestHandler<GroupService.IUserGroupsRequest> = async (req, res) => {
  try {
    const userGroups = await GroupService.getUserGroups(req);
    output.api(req, res, userGroups.map(userGroup => GroupService.getShareableUserGroup(userGroup)));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createGroup: IRequestHandler<{}, {}, GroupService.IGroupRequestBody> = async (req, res) => {
  try {
    const group = await GroupService.createGroup(req);
    output.api(req, res, GroupService.getShareableGroup(group));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const deleteGroup: IRequestHandler<GroupService.IGroupRequestParams> = async (req, res) => {
  try {
    await GroupService.deleteGroup(req);
    output.api(req, res, null);
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

export const leaveGroup: IRequestHandler<GroupService.IGroupRequestParams> = async (req, res) => {
  try {
    await GroupService.leaveGroup(req);
    output.api(req, res, null);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateGroup: IRequestHandler<GroupService.IGroupRequestParams, {}, GroupService.IGroupRequestBody> = async (req, res) => {
  try {
    const group = await GroupService.updateGroup(req);
    output.api(req, res, GroupService.getShareableGroup(group));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateUserGroup: IRequestHandler<GroupService.IUpdateUserGroupRequestParams, {}, GroupService.IUpdateUserGroupRequestBody> = async (req, res) => {
  try {
    const userGroup = await GroupService.updateUserGroup(req);
    output.api(req, res, GroupService.getShareableUserGroup(userGroup));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateUserGroups: IRequestHandler<GroupService.IGroupRequestParams, {}, GroupService.IUpdateUserGroupsRequestBody> = async (req, res) => {
  try {
    const userGroups = await GroupService.updateUserGroups(req);
    output.api(req, res, userGroups.map(userGroup => GroupService.getShareableUserGroup(userGroup)));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getGroupOffsetData: IRequestHandler<GroupService.IGetGroupOffsetRequestParams, { state: string }, {} > = async (req, res) => {
  try {
    const groupDashboard = await GroupService.getGroupOffsetData(req);
    output.api(req, res, { ...groupDashboard, userGroup: GroupService.getShareableUserGroup(groupDashboard.userGroup) });
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getGroupOffsetEquivalency: IRequestHandler<GroupService.IGetGroupOffsetRequestParams, { state: string }, {} > = async (req, res) => {
  try {
    const groupOffsetEquivalency = await GroupService.getGroupOffsetEquivalency(req);
    output.api(req, res, groupOffsetEquivalency);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
