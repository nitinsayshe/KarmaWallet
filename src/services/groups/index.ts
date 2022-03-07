import isemail from 'isemail';
import { FilterQuery } from 'mongoose';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ErrorTypes, UserGroupRole, UserRoles } from '../../lib/constants';
import { DOMAIN_REGEX } from '../../lib/constants/regex';
import CustomError, { asCustomError } from '../../lib/customError';
import { CompanyModel } from '../../models/company';
import {
  IUserDocument, UserEmailStatus, UserModel,
} from '../../models/user';
import {
  IGroupDocument, GroupModel, IShareableGroup, IGroupSettings, GroupPrivacyStatus, IGroup, GroupStatus,
} from '../../models/group';
import {
  IShareableUserGroup, IUserGroupDocument, UserGroupModel, UserGroupStatus,
} from '../../models/userGroup';
import { IRequest } from '../../types/request';
import { getShareableUser, getUser } from '../user';

dayjs.extend(utc);

export interface ICheckCodeRequest {
  code: string;
}

export interface IGetGroupRequest {
  code?: string;
}

export interface IUserGroupsRequest {
  userId: string;
}

export interface IGroupRequestParams {
  groupId?: string;
}

export interface IUpdateUserGroupRequestParams {
  userId: string;
  groupId: string;
}

export interface IUpdateUserGroupRequestBody {
  email: string;
  role: UserGroupRole;
  status: UserGroupStatus;
}

export interface IGroupRequestBody {
  owner?: string; // the id of the owner
  name: string;
  code: string;
  status: GroupStatus;
  settings: IGroupSettings;
  domains: string[];
}

export interface IJoinGroupRequest {
  groupCode: string;
  groupEmail: string;
  userId: string;
}

const MAX_CODE_LENGTH = 16;

const defaultGroupSettings: IGroupSettings = {
  privacyStatus: GroupPrivacyStatus.Private,
  allowInvite: false,
  allowDomainRestriction: false,
  allowSubgroups: false,
  approvalRequired: false,
  matching: {
    enabled: false,
    matchPercentage: -1,
    maxDollarAmount: -1,
    lastModified: dayjs().utc().toDate(),
  },
};

export const isValidCode = (code: string) => {
  if (code.length > MAX_CODE_LENGTH) return false;

  // returns false if any invalid characters are found.
  return !/[^a-zA-Z0-9-]/gm.test(code);
};

export const checkCode = async (req: IRequest<{}, ICheckCodeRequest>) => {
  try {
    const group = await GroupModel.findOne({ code: req.query.code });
    return { available: !group, isValid: isValidCode(req.query.code) };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getShareableGroup = ({
  _id,
  name,
  code,
  domains,
  settings,
  owner,
  status,
  lastModified,
  createdOn,
}: IGroupDocument): (IShareableGroup & { _id: string }) => {
  const _owner = getShareableUser(owner as IUserDocument);
  return {
    _id,
    name,
    code,
    domains,
    settings,
    status,
    owner: _owner,
    lastModified,
    createdOn,
  };
};

export const getShareableUserGroup = ({
  _id,
  group,
  email,
  role,
  status,
  joinedOn,
}: IUserGroupDocument): (IShareableUserGroup & { _id: string }) => {
  const _group = getShareableGroup(group as IGroupDocument);

  return {
    _id,
    email,
    role,
    status,
    joinedOn,
    group: _group,
  };
};

export const getGroup = async (req: IRequest<IGroupRequestParams, IGetGroupRequest>) => {
  try {
    const { groupId } = req.params;
    const { code } = req.query;
    if (!code && !groupId) throw new CustomError('Group id or code is required.', ErrorTypes.INVALID_ARG);

    const query: FilterQuery<IGroup> = {};

    if (!!groupId) query._id = groupId;
    if (!!code) query.code = code;

    const group = await GroupModel.findOne(query)
      .populate([
        {
          path: 'company',
          model: CompanyModel,
        },
        {
          path: 'owner',
          model: UserModel,
        },
      ]);

    if (!group) {
      if (!!groupId) throw new CustomError(`A group with id: ${groupId} could not be found.`, ErrorTypes.NOT_FOUND);
      if (!!code) throw new CustomError(`A group with code: ${code} could not be found.`, ErrorTypes.NOT_FOUND);
    }

    return group;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getGroups = (__: IRequest, query: FilterQuery<IGroup>) => {
  // TODO: add support getting name by sub string
  // TODO: add not returning private groups unless requestor is karma member

  const options = {
    projection: query?.projection || '',
    populate: query.population || [
      {
        path: 'company',
        model: CompanyModel,
      },
      {
        path: 'owner',
        model: UserModel,
      },
    ],
    lean: true,
    page: query?.skip || 1,
    sort: query?.sort ? { ...query.sort, _id: 1 } : { name: 1, _id: 1 },
    limit: query?.limit || 10,
  };
  return GroupModel.paginate(query.filter, options);
};

export const getUserGroups = async (req: IRequest<IUserGroupsRequest>) => {
  const { userId } = req.params;
  try {
    if (!userId) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    if (req.requestor._id !== userId && req.requestor.role === UserRoles.None) {
      throw new CustomError('You are not authorized to request this user\'s groups.', ErrorTypes.UNAUTHORIZED);
    }

    return await UserGroupModel.find({
      user: userId,
      status: { $nin: [UserGroupStatus.Removed, UserGroupStatus.Banned, UserGroupStatus.Left] },
    })
      .populate([
        {
          path: 'group',
          model: GroupModel,
          populate: [
            {
              path: 'company',
              model: CompanyModel,
            },
            {
              path: 'owner',
              model: UserModel,
            },
          ],
        },
      ]);
  } catch (err) {
    throw asCustomError(err);
  }
};

export const verifyDomains = (domains: string[], allowDomainRestriction: boolean) => {
  if (allowDomainRestriction && (!domains || !Array.isArray(domains) || domains.length === 0)) throw new CustomError('In order to support restricting email domains, you must provide a list of domains to limit to.', ErrorTypes.INVALID_ARG);
  if (!allowDomainRestriction) return [];

  const invalidDomains = domains.filter(d => {
    DOMAIN_REGEX.lastIndex = 0;
    return !DOMAIN_REGEX.test(d);
  });
  if (!!invalidDomains.length) throw new CustomError(`The following domains are invalid: ${invalidDomains.join(', ')}.`, ErrorTypes.INVALID_ARG);

  // remove duplicate domains
  const _domains = new Set(domains);

  return Array.from(_domains);
};

export const verifyGroupSettings = (settings: IGroupSettings) => {
  const _settings = defaultGroupSettings;
  if (!!settings) {
    // settings provided...only add supported settings
    // to group...
    const {
      privacyStatus,
      allowInvite,
      allowDomainRestriction,
      allowSubgroups,
      approvalRequired,
      matching,
    } = settings;

    if (
      !privacyStatus
      && !allowInvite
      && !allowDomainRestriction
      && !allowSubgroups
      && !approvalRequired
      && !matching
    ) {
      throw new CustomError('No valid settings were found. Please try again.', ErrorTypes.INVALID_ARG);
    }

    if (!!privacyStatus) _settings.privacyStatus = privacyStatus;
    if (!!allowInvite) _settings.allowInvite = allowInvite;
    if (!!allowDomainRestriction) _settings.allowDomainRestriction = allowDomainRestriction;
    if (!!allowSubgroups) _settings.allowSubgroups = allowSubgroups;
    if (!!approvalRequired) _settings.approvalRequired = approvalRequired;
    if (!!matching) {
      const {
        enabled,
        matchPercentage = -1,
        maxDollarAmount = -1,
      } = matching;

      if (enabled) {
        _settings.matching.enabled = enabled;

        if (!matchPercentage && !maxDollarAmount) throw new CustomError('To support group matching, a match percentage or max dollar amount must be specified.', ErrorTypes.INVALID_ARG);
        const _matchPercentage = parseFloat(`${matchPercentage}`);
        const _maxDollarAmount = parseFloat(`${maxDollarAmount}`);
        if (isNaN(_matchPercentage)) throw new CustomError('Invalid match percent found. Must be a number.', ErrorTypes.INVALID_ARG);
        if (isNaN(_maxDollarAmount)) throw new CustomError('Invalid max dollar amount found. Must be a number.', ErrorTypes.INVALID_ARG);
        if (matchPercentage < 0 && maxDollarAmount < 0) throw new CustomError('To support group matching, a match percentage or max dollar amount must be specified.', ErrorTypes.INVALID_ARG);
        _settings.matching.matchPercentage = _matchPercentage;
        _settings.matching.maxDollarAmount = _maxDollarAmount;
      }
    }
  }

  return _settings;
};

export const createGroup = async (req: IRequest<{}, {}, IGroupRequestBody>) => {
  try {
    const {
      owner,
      name,
      code,
      settings,
      domains,
    } = req.body;

    if (!name) throw new CustomError('A group name is required.', ErrorTypes.INVALID_ARG);
    if (!code) throw new CustomError('A group code is required.', ErrorTypes.INVALID_ARG);
    if (!isValidCode(code)) throw new CustomError('Invalid code found. Group codes can only contain letters, numbers, and hyphens (-).', ErrorTypes.INVALID_ARG);

    const existingGroup = await GroupModel.findOne({ code });

    if (!!existingGroup) throw new CustomError('This group code is already in use.', ErrorTypes.INVALID_ARG);

    const group = new GroupModel({
      name,
      code,
      settings: defaultGroupSettings,
    });

    if (!!settings) group.settings = verifyGroupSettings(settings);

    group.domains = verifyDomains(domains, !!group.settings.allowDomainRestriction);

    if (!!owner) {
      // requestor must have appropriate permissions to assign a group owner.
      if (req.requestor.role === UserRoles.None) throw new CustomError('You do not authorized to assign an owner to a group.', ErrorTypes.UNAUTHORIZED);
      const _owner = await getUser(req, { _id: owner });
      if (!_owner) throw new CustomError(`Owner with id: ${owner} could not be found.`, ErrorTypes.NOT_FOUND);
      group.owner = _owner;
    } else {
      group.owner = req.requestor;
    }

    const userGroup = new UserGroupModel({
      group,
      user: group.owner,
      email: group.owner.email,
      role: UserGroupRole.Owner,
      status: UserGroupStatus.Approved,
    });

    await userGroup.save();
    return await group.save();
  } catch (err) {
    throw asCustomError(err);
  }
};

export const joinGroup = async (req: IRequest<{}, {}, IJoinGroupRequest>) => {
  try {
    const { groupCode, groupEmail, userId } = req.body;

    if (!groupCode) throw new CustomError('A group code is required.', ErrorTypes.INVALID_ARG);
    if (!userId) throw new CustomError('No user specified to join this group.', ErrorTypes.INVALID_ARG);

    const group = await GroupModel.findOne({ code: groupCode });
    if (!group) throw new CustomError(`A group was not found with code: ${groupCode}`, ErrorTypes.NOT_FOUND);
    if (group.status === GroupStatus.Locked) throw new CustomError('This group is not accepting new members.', ErrorTypes.NOT_ALLOWED);

    let user: IUserDocument;
    if (userId === req.requestor._id) {
      user = req.requestor;
    } else {
      // requestor must be a Karma member to add another user to a group
      if (req.requestor.role === UserRoles.None) throw new CustomError('You are not authorized to add another user to a group.', ErrorTypes.UNAUTHORIZED);
      user = await getUser(req, { _id: userId });
    }

    if (!user) throw new CustomError('User not found.', ErrorTypes.NOT_FOUND);

    // confirm that user has not been banned from group
    const existingUserGroup = await UserGroupModel.findOne({
      group,
      user,
      email: groupEmail,
    });

    if (existingUserGroup?.status === UserGroupStatus.Banned) {
      throw new CustomError('You are not authorized to join this group.', ErrorTypes.UNAUTHORIZED);
    }

    // TODO: status === Removed, check if needs approval to join again

    let validEmail: string;
    if (group.settings.allowDomainRestriction && group.domains.length > 0) {
      if (!isemail.validate(groupEmail, { minDomainAtoms: 2 })) {
        throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
      }

      // ??? should we support falling back to existing user emails if the groupEmail does not
      // meet the groups requirements???
      // const validEmail = [groupEmail, user.email, ...(user.altEmails || [])].find(email => {
      const _validEmail = [groupEmail].find(email => !!group.domains.find(domain => email.split('@')[1] === domain));

      if (!_validEmail) throw new CustomError(`A valid email from ${group.domains.length > 1 ? 'one of ' : ''}the following domain${group.domains.length > 1 ? 's' : ''} is required to join this group: ${group.domains.join(', ')}`);

      validEmail = _validEmail;
    }

    // add groupEmail to user's list of altEmails if doesnt already exist
    if (!user.altEmails.find(altEmail => altEmail.email === validEmail)) {
      user.altEmails.push({
        email: validEmail,
        status: UserEmailStatus.Unverified,
      });
    }

    const userGroup = new UserGroupModel({
      user,
      group,
      email: validEmail,
      role: UserGroupRole.Member,
      status: UserGroupStatus.Unverified,
    });

    await userGroup.save();
    await user.save();

    return userGroup;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updateGroup = async (req: IRequest<IGroupRequestParams, {}, IGroupRequestBody>) => {
  const { groupId } = req.params;
  const {
    owner,
    name,
    code,
    status,
    settings,
    domains,
  } = req.body;
  try {
    if (!owner && !name && !code && !status && !settings && !domains) {
      throw new CustomError('No updatable data found.', ErrorTypes.UNPROCESSABLE);
    }

    const group = await GroupModel
      .findOne({ _id: groupId })
      .populate([
        {
          path: 'owner',
          model: UserModel,
        },
      ]);

    if (!group) throw new CustomError(`Group with id: ${groupId} not found.`, ErrorTypes.NOT_FOUND);

    const userGroup = await UserGroupModel.findOne({
      group,
      user: req.requestor,
    });

    // requestor must be an admin (or higher) for the group
    // OR be an internal karma member to update a group.
    //
    // ??? if they are a karma member AND part of the group, should
    // they still have to have admin permissions for the group to
    // update?
    if ((!!userGroup && userGroup.role === UserGroupRole.Member) || (!userGroup && req.requestor.role === UserRoles.None)) {
      throw new CustomError('You are not authorized to update this group.', ErrorTypes.UNAUTHORIZED);
    }

    if (!!owner && owner !== (group.owner as IUserDocument)._id) {
      // TODO: only allow updating owner if requestor is karma member or owner of group...

      const newOwner = await getUser(req, { _id: owner });

      if (!newOwner) throw new CustomError(`Owner with id: ${owner} not found.`, ErrorTypes.NOT_FOUND);

      group.owner = newOwner;

      // create or update userGroup for this new owner.
      // ??? only if they meet the groups protection requirements???
      //   - or should the owner be able to override these rules?
      let ownerUserGroup = await UserGroupModel.findOne({
        group,
        user: newOwner,
      });

      if (!!ownerUserGroup) {
        // update existing user group
        ownerUserGroup.role = UserGroupRole.Owner;
      } else {
        // create new user group
        ownerUserGroup = new UserGroupModel({
          group,
          user: group.owner,
          email: group.owner.email,
          role: UserGroupRole.Owner,
          status: UserGroupStatus.Approved,
        });

        // ??? do we want to require email verification? which email to set here?

        await ownerUserGroup.save();
      }

      // TODO: ??? remove old owner???
      //   - how do we want to handle this? keep them in group with reduced permissions? or remove them from group?
    }

    if (!!name) group.name = name;

    if (!!code) {
      if (!isValidCode(code)) throw new CustomError('Invalid code found. Group codes can only contain letters, numbers, and hyphens (-).', ErrorTypes.INVALID_ARG);
      group.code = code;
    }

    if (!!status && group.status !== status) {
      if (!Object.values(GroupStatus).includes(status)) {
        throw new CustomError('Invalid group status.', ErrorTypes.INVALID_ARG);
      }

      // only the owner of the group, and karma members, may change the a groups status
      if (req.requestor.role === UserRoles.None && userGroup.role !== UserGroupRole.Owner) {
        throw new CustomError('You are not authorized to update this group\'s status.', ErrorTypes.UNAUTHORIZED);
      }

      group.status = status;
    }

    if (!!settings) {
      const updatedSettings = { ...group.settings, ...settings };
      group.settings = verifyGroupSettings(updatedSettings);
    }

    if (!!domains) group.domains = verifyDomains(domains, !!group.settings.allowDomainRestriction);

    await group.save();
    return group;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updateUserGroup = async (req: IRequest<IUpdateUserGroupRequestParams, {}, IUpdateUserGroupRequestBody>, internalOverride = false) => {
  const { userId, groupId } = req.params;
  const { email, role, status } = req.body;

  try {
    const userGroups = await UserGroupModel.find({
      $or: [
        {
          user: userId,
          group: groupId,
        },
        {
          user: req.requestor,
          group: groupId,
        },
      ],
    })
      .populate([
        {
          path: 'user',
          model: UserModel,
        },
        {
          path: 'group',
          model: GroupModel,
        },
      ]);

    const userGroup = userGroups.find(u => (u.user as IUserDocument)._id === userId);
    const requestorUserGroup = userGroups.find(u => (u.user as IUserDocument)._id === req.requestor._id);

    if (!userGroup) throw new CustomError(`A group with id: ${groupId} was not found for this user.`, ErrorTypes.NOT_FOUND);
    if (req.requestor.role === UserRoles.None && !requestorUserGroup) {
      throw new CustomError('You are not allowed to make this request.', ErrorTypes.UNAUTHORIZED);
    }

    // make array of the user group roles so can use the index as a score to be compared to.
    const userGroupRoleScores = [UserGroupRole.Member, UserGroupRole.Admin, UserGroupRole.SuperAdmin, UserGroupRole.Owner];

    if (!!email) {
      // only the user or a karma member can update the email
      if (req.requestor._id !== (userGroup.user as IUserDocument)._id && req.requestor.role === UserRoles.None) {
        throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);
      }

      // TODO: validate email format

      userGroup.email = email;

      // TODO: add email verification
    }

    const origUserGroupRoleScore = userGroupRoleScores.indexOf(userGroup.role);
    const requestorGroupRoleScore = !!requestorUserGroup ? userGroupRoleScores.indexOf(requestorUserGroup.role) : -1;

    if (!!role && role !== userGroup.role) {
      if (!userGroupRoleScores.includes(role)) {
        throw new CustomError(`Invalid user group role: ${role}`, ErrorTypes.INVALID_ARG);
      }

      if (req.requestor._id === userId) throw new CustomError('You are not allowed to change your own role within this group.', ErrorTypes.UNAUTHORIZED);

      if (!!requestorUserGroup) {
        // roll is not allowed to be updated if requestor is not a karma member, and they have an equal
        // or lesser role than the user being updated
        //
        // example, if the person making the request is an admin for a group, they cannot change the role
        // of another admin within that group. only the owner or a superadmin would be able to do that.
        if (req.requestor.role === UserRoles.None && origUserGroupRoleScore >= requestorGroupRoleScore) {
          throw new CustomError('You are not authorized to change this user\'s role within this grouop.', ErrorTypes.UNAUTHORIZED);
        }
      }

      userGroup.role = role;
    }

    if (!!status && status !== userGroup.status) {
      if (!Object.values(UserGroupStatus).includes(status)) {
        throw new CustomError(`Invalid status found: ${status}`, ErrorTypes.INVALID_ARG);
      }

      if (status === UserGroupStatus.Left) {
        // only the user can leave a group...
        if (req.requestor._id !== userId) {
          throw new CustomError('You are not authorized to update this user\'s status.', ErrorTypes.UNAUTHORIZED);
        }
      }

      if (status === UserGroupStatus.Removed || status === UserGroupStatus.Banned) {
        if (req.requestor._id === userId) {
          throw new CustomError('You are not allowed to remove or ban yourself from a group. Try Leaving a group instead.', ErrorTypes.NOT_ALLOWED);
        }

        if (!!requestorUserGroup && req.requestor.role === UserRoles.None && origUserGroupRoleScore >= requestorGroupRoleScore) {
          throw new CustomError('You are not authorized to remove or ban this user.', ErrorTypes.UNAUTHORIZED);
        }
      }

      if (status === UserGroupStatus.Approved) {
        if (!!requestorUserGroup && req.requestor.role === UserRoles.None && origUserGroupRoleScore >= requestorGroupRoleScore) {
          throw new CustomError('You are not authorized to approve this user.', ErrorTypes.UNAUTHORIZED);
        }
      }

      if (status === UserGroupStatus.Verified) {
        // only internal processes (like the email verification process) are allowed to mark a user as verified
        if (!internalOverride) {
          throw new CustomError('You are not authorized to verify this user.', ErrorTypes.UNAUTHORIZED);
        }
      }

      userGroup.status = status;
    }

    userGroup.lastModified = dayjs().utc().toDate();
    await userGroup.save();
    return userGroup;
  } catch (err) {
    throw asCustomError(err);
  }
};
