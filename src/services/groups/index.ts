import isemail from 'isemail';
import { FilterQuery } from 'mongoose';
import { ErrorTypes, UserRoles } from '../../lib/constants';
import { DOMAIN_REGEX } from '../../lib/constants/regex';
import CustomError, { asCustomError } from '../../lib/customError';
import { CompanyModel } from '../../models/company';
import {
  IUserDocument, UserEmailStatus, UserGroupRole, UserModel,
} from '../../models/user';
import {
  IGroupDocument, GroupModel, IShareableGroup, IGroupSettings, GroupPrivacyStatus, IGroup,
} from '../../models/group';
import {
  IShareableUserGroup, IUserGroupDocument, UserGroupModel, UserGroupStatus,
} from '../../models/userGroup';
import { IRequest } from '../../types/request';
import { getShareableUser, getUser } from '../user';

export interface IGetGroupRequest {
  code?: string;
}

export interface IGetUserGroupsRequest {
  userId: string;
}

export interface IGetGroupsRequestParams {
  groupId?: string;
}

export interface ICreateGroupRequest {
  owner?: string; // the id of the owner
  name: string;
  code: string;
  settings: IGroupSettings;
  domains: string[];
}

export interface IJoinGroupRequest {
  groupCode: string;
  groupEmail: string;
  userId: string;
}

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
    lastModified: new Date(),
  },
};

export const getShareableGroup = ({
  _id,
  name,
  code,
  domains,
  settings,
  owner,
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

export const getGroup = async (req: IRequest<IGetGroupsRequestParams, IGetGroupRequest>) => {
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

export const getUserGroups = async (req: IRequest<IGetUserGroupsRequest>) => {
  const { userId } = req.params;
  try {
    if (!userId) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    if (req.requestor._id !== userId && req.requestor.role === UserRoles.None) {
      throw new CustomError('You are not authorized to request this user\'s groups.', ErrorTypes.UNAUTHORIZED);
    }

    return await UserGroupModel.find({ user: userId })
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

  const invalidDomains = domains.filter(d => !DOMAIN_REGEX.test(d));
  if (!!invalidDomains.length) throw new CustomError(`The following domains are invalid: ${invalidDomains.join(', ')}.`, ErrorTypes.INVALID_ARG);

  return domains;
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

export const createGroup = async (req: IRequest<{}, {}, ICreateGroupRequest>) => {
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
