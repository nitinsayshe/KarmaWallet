import aqp from 'api-query-params';
import isemail from 'isemail';
import {
  FilterQuery, isValidObjectId, Schema, UpdateQuery,
} from 'mongoose';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { nanoid } from 'nanoid';
import {
  emailVerificationDays, TokenTypes,
  ErrorTypes, UserGroupRole, UserRoles,
} from '../../lib/constants';
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
  IShareableUserGroup, IUserGroup, IUserGroupDocument, UserGroupModel,
} from '../../models/userGroup';
import { IRequest } from '../../types/request';
import * as TokenService from '../token';
import { sendGroupVerificationEmail } from '../email';
import { getUser } from '../user';
import { averageAmericanEmissions as averageAmericanEmissionsData } from '../impact';
import {
  getOffsetTransactionsTotal, getRareOffsetAmount, getEquivalencies, IEquivalencyObject,
} from '../impact/utils/carbon';
import { getRandomInt } from '../../lib/number';
import { IRef } from '../../types/model';
import { createCachedData, getCachedData } from '../cachedData';
import { getGroupOffsetDataKey } from '../cachedData/keyGetters';
import {
  IOffsetsStatement, IShareableStatementRef, IStatement, IStatementDocument,
} from '../../models/statement';
import { getStatements } from '../statements';
import {
  ITransactionDocument, ITransactionMatch, MatchTypes,
} from '../../models/transaction';
import { UserGroupStatus } from '../../types/groups';

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

export interface IUserGroupRequest {
  userId: string;
  groupId: string;
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

export interface IUpdateUserGroupsRequestBody {
  status: UserGroupStatus;
  memberIds: string[];
}

export interface IGroupRequestBody {
  owner?: string; // the id of the owner
  name: string;
  code: string;
  logo: string;
  status: GroupStatus;
  settings: IGroupSettings;
  domains: string[];
}

export interface IJoinGroupRequest {
  code: string;
  email: string;
  userId: string;
}

export interface IGetGroupOffsetRequestParams {
  groupId: string,
}

export interface IGroupOffsetMatchData {
  group: IGroupDocument;
  statements: IStatementDocument[];
  totalAmountMatched: number;
  transactor: {
    user?: string;
    group?: IRef<Schema.Types.ObjectId, IGroupDocument>;
  };
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
    matchPercentage: null,
    maxDollarAmount: null,
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

export const verifyGroupSettings = (settings: IGroupSettings, previousSettings?: IGroupSettings) => {
  const _settings = { ...defaultGroupSettings, ...(previousSettings || {}) };
  if (!!settings) {
    // settings provided...only add supported settings
    // to group...
    if (
      !('privacyStatus' in settings)
      && !('allowInvite' in settings)
      && !('allowDomainRestriction' in settings)
      && !('allowSubgroups' in settings)
      && !('approvalRequired' in settings)
      && !('matching' in settings)
    ) {
      throw new CustomError('No valid settings were found. Please try again.', ErrorTypes.INVALID_ARG);
    }

    if ('privacyStatus' in settings) {
      if (!Object.values(GroupPrivacyStatus).includes(settings.privacyStatus)) {
        throw new CustomError('Invalid Privacy Status found.', ErrorTypes.INVALID_ARG);
      }

      _settings.privacyStatus = settings.privacyStatus;
    }

    if ('allowInvite' in settings) _settings.allowInvite = !!settings.allowInvite;
    if ('allowDomainRestriction' in settings) {
      _settings.allowDomainRestriction = !!settings.allowDomainRestriction;
    }

    if ('allowSubgroups' in settings) _settings.allowSubgroups = !!settings.allowSubgroups;
    if ('approvalRequired' in settings) _settings.approvalRequired = !!settings.approvalRequired;
    if ('matching' in settings) {
      const {
        enabled,
        matchPercentage,
        maxDollarAmount,
      } = settings.matching;

      if (enabled) {
        if (!matchPercentage && !maxDollarAmount) throw new CustomError('To support group matching, a match percentage or max dollar amount must be specified.', ErrorTypes.INVALID_ARG);

        let _matchPercentage: number;
        let _maxDollarAmount: number;
        let changeFound = _settings.matching.enabled !== !!enabled;

        if (!!matchPercentage) {
          _matchPercentage = parseFloat(`${matchPercentage}`);

          if (isNaN(_matchPercentage)) throw new CustomError('Invalid match percent found. Must be a number.', ErrorTypes.INVALID_ARG);
          if (_matchPercentage <= 0 || _matchPercentage > 100) throw new CustomError('Invalid match percent found. Must be a number greater than 0, but less than or equal to 100.', ErrorTypes.INVALID_ARG);

          if (_settings.matching.matchPercentage !== _matchPercentage) changeFound = true;

          _settings.matching.matchPercentage = _matchPercentage;
        } else {
          if (_settings.matching.matchPercentage !== null) changeFound = true;

          _settings.matching.matchPercentage = null;
        }

        if (!!maxDollarAmount) {
          _maxDollarAmount = parseFloat(`${maxDollarAmount}`);

          if (isNaN(_maxDollarAmount)) throw new CustomError('Invalid max dollar amount found. Must be a number.', ErrorTypes.INVALID_ARG);
          if (_maxDollarAmount < 0) throw new CustomError('Invalid max dollar amount found. Must be a number greater than or equal to 0.', ErrorTypes.INVALID_ARG);

          if (!!_maxDollarAmount) {
            if (_settings.matching.maxDollarAmount !== _maxDollarAmount) changeFound = true;

            _settings.matching.maxDollarAmount = _maxDollarAmount;
          } else {
            // maxDollarAmount was set to 0, so just defaulting to null
            if (_settings.matching.maxDollarAmount !== null) changeFound = true;

            _settings.matching.maxDollarAmount = null;
          }
        } else {
          if (_settings.matching.maxDollarAmount !== null) changeFound = true;

          _settings.matching.maxDollarAmount = null;
        }

        _settings.matching.enabled = !!enabled;
        if (changeFound) _settings.matching.lastModified = dayjs().utc().toDate();
      } else {
        const changeFound = _settings.matching.enabled !== enabled
          || _settings.matching.matchPercentage !== null
          || _settings.matching.maxDollarAmount !== null;

        _settings.matching.matchPercentage = null;
        _settings.matching.maxDollarAmount = null;
        _settings.matching.enabled = false;
        if (changeFound) {
          _settings.matching.lastModified = dayjs().utc().toDate();
        }
      }
    }
  }

  return _settings;
};

const buildGetMemberQuery = async (req: IRequest<IGroupRequestParams>, karmaAllowList = [UserRoles.Admin, UserRoles.SuperAdmin]) => {
  const { groupId } = req.params;
  if (!groupId) throw new CustomError('A group id is required.', ErrorTypes.INVALID_ARG);

  let requestorUserGroup: IUserGroupDocument;

  // user must be a member of this group or a karma member
  // to view its members
  if (!karmaAllowList.includes(req.requestor.role as UserRoles)) {
    requestorUserGroup = await UserGroupModel.findOne({
      group: groupId,
      user: req.requestor._id,
    });

    if (
      !requestorUserGroup
        || requestorUserGroup.status === UserGroupStatus.Left
        || requestorUserGroup.status === UserGroupStatus.Removed
        || requestorUserGroup.status === UserGroupStatus.Banned
    ) {
      throw new CustomError('You are not authorized to view this group\'s members.', ErrorTypes.UNAUTHORIZED);
    }
  }

  // regular members only need to see verified and approved members
  // only admins (or higher) and karma members need to be able to
  // see all the other members.
  const statusesToExclude = requestorUserGroup?.role === UserGroupRole.Member
    ? [UserGroupStatus.Unverified, UserGroupStatus.Left, UserGroupStatus.Removed, UserGroupStatus.Banned]
    : [UserGroupStatus.Left];

  const query: FilterQuery<IUserGroup> = {
    group: groupId,
    status: { $nin: statusesToExclude },
  };

  return query;
};

export const createGroup = async (req: IRequest<{}, {}, IGroupRequestBody>) => {
  const karmaAllowList = [UserRoles.Admin, UserRoles.SuperAdmin];
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
      createdOn: dayjs().utc().toDate(),
    });

    if (!!settings) group.settings = verifyGroupSettings(settings);

    group.domains = verifyDomains(domains, !!group.settings.allowDomainRestriction);

    if (!!owner) {
      // requestor must have appropriate permissions to assign a group owner.
      if (!karmaAllowList.includes(req.requestor.role as UserRoles)) throw new CustomError('You are not authorized to assign an owner to a group.', ErrorTypes.UNAUTHORIZED);
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
      status: UserGroupStatus.Verified,
      joinedOn: dayjs().utc().toDate(),
    });

    await userGroup.save();
    return await group.save();
  } catch (err) {
    throw asCustomError(err);
  }
};

export const deleteGroup = async (req: IRequest<IGroupRequestParams>) => {
  const karmaAllowList = [UserRoles.Admin, UserRoles.SuperAdmin];

  const { groupId } = req.params;
  try {
    if (!groupId) throw new CustomError('A group id is required.', ErrorTypes.INVALID_ARG);

    let userGroup: IUserGroupDocument;
    if (!karmaAllowList.includes(req.requestor.role as UserRoles)) {
      userGroup = await UserGroupModel.findOne({ group: groupId });
    }

    // only a karma member or the owner of the group can delete
    if (!karmaAllowList.includes(req.requestor.role as UserRoles) && userGroup?.role !== UserGroupRole.Owner) {
      throw new CustomError('You are not authorized to delete this group.', ErrorTypes.UNAUTHORIZED);
    }

    const group = await GroupModel.findOne({ _id: groupId });

    if (!group) throw new CustomError(`Group with id: ${groupId} not found.`, ErrorTypes.NOT_FOUND);

    await UserGroupModel.deleteMany({ group: groupId });

    // TODO: delete all group statements

    await GroupModel.deleteOne({ _id: groupId });

    // ??? send notification to users that group has been deleted???
  } catch (err) {
    throw asCustomError(err);
  }
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
        {
          path: 'members',
          model: UserGroupModel,
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

export const getGroupMembers = async (req: IRequest, query: FilterQuery<IUserGroup>) => {
  try {
    const getMemberQuery = await buildGetMemberQuery(req);
    const options = {
      projection: query?.projection || '',
      populate: query.population || [
        {
          path: 'user',
          model: UserModel,
        },
      ],
      page: query?.skip || 1,
      sort: query?.sort ? { ...query.sort, _id: 1 } : { name: 1, _id: 1 },
      limit: query?.limit || 20,
    };

    return UserGroupModel.paginate({ ...getMemberQuery, ...query.filter }, options);
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getAllGroupMembers = async (req: IRequest<IGroupRequestParams>) => {
  try {
    const query = await buildGetMemberQuery(req);

    const memberUserGroups = await UserGroupModel
      .find(query)
      .populate([
        {
          path: 'user',
          model: UserModel,
        },
      ]);

    return memberUserGroups;
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
      {
        path: 'members',
        model: UserGroupModel,
      },
    ],
    lean: true,
    page: query?.skip || 1,
    sort: query?.sort ? { ...query.sort, _id: 1 } : { name: 1, _id: 1 },
    limit: query?.limit || 10,
  };
  return GroupModel.paginate(query.filter, options);
};

export const getDummyStatements = () => {
  const count = 30;
  const statements: (IShareableStatementRef & { _id: string })[] = [];
  let timestamp = dayjs().set('date', 14);

  for (let i = 0; i < count; i++) {
    const amount = getRandomInt(5, 5000);
    const matched = !!getRandomInt(0, 1);
    const statement: IShareableStatementRef = {
      offsets: {
        matchPercentage: 50,
        maxDollarAmount: 150,
        toBeMatched: {
          dollars: amount * 0.8,
          tonnes: (amount * 0.018) * 0.8,
        },
        totalMemberOffsets: {
          dollars: amount,
          tonnes: amount * 0.018,
        },
      },
      date: timestamp.toDate(),
    };

    if (matched) {
      statement.offsets.matched = {
        dollars: 1.34,
        tonnes: 0.077,
        date: timestamp.toDate(),
      };
    }

    statements.push({
      _id: nanoid(16),
      ...statement,
    });

    timestamp = timestamp.subtract(1, 'month');
  }

  return {
    docs: statements,
    totalDocs: 1,
    limit: count,
    totalPages: 1,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null as any,
    nextPage: null as any,
  };
};

export const getGroupOffsetStatements = async (req: IRequest<IGroupRequestParams, (FilterQuery<IStatement> & { state?: 'dev' })>) => {
  const karmaAllowList = [UserRoles.Admin, UserRoles.SuperAdmin];
  try {
    const { groupId } = req.params;
    if (!groupId) throw new CustomError('A group id is required.', ErrorTypes.INVALID_ARG);

    // only karma admins+ or group superadmins+ are allowed
    // to view these statements.
    if (!karmaAllowList.includes(req.requestor.role as UserRoles)) {
      const groupAllowList = [UserGroupRole.SuperAdmin, UserGroupRole.Owner];

      const userGroup = await UserGroupModel.findOne({
        user: req.requestor._id.toString(),
        group: groupId,
        role: { $in: groupAllowList },
      });

      if (!userGroup) throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);
    }

    const aqpQuery = aqp(req.query, { skipKey: 'page' });
    const query = {
      ...aqpQuery,
      filter: {
        ...aqpQuery.filter,
        group: groupId,
        offset: { $exists: true },
      },
    };

    return getStatements(req, query);
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getShareableGroup = ({
  _id,
  name,
  code,
  domains,
  logo,
  settings,
  members,
  owner,
  status,
  lastModified,
  createdOn,
}: IGroupDocument): (IShareableGroup & { _id: string }) => {
  const fullOwner = (owner as IUserDocument);
  const _owner = {
    _id: fullOwner._id,
    name: fullOwner.name,
  };

  return {
    _id,
    name,
    code,
    domains,
    logo,
    settings,
    status,
    owner: _owner,
    totalMembers: members?.length || null,
    lastModified,
    createdOn,
  };
};

export const getShareableGroupMember = ({
  user,
  email,
  role,
  status,
  joinedOn,
}: IUserGroupDocument) => {
  const { name, _id } = (user as IUserDocument);
  return {
    _id,
    name,
    email,
    role,
    status,
    joinedOn,
  };
};

export const getShareableGroupOffsetStatementRef = ({
  _id,
  offsets,
  date,
}: IStatementDocument) => {
  const {
    matchPercentage,
    maxDollarAmount,
    matched,
    toBeMatched,
    totalMemberOffsets,
  } = offsets;
  const _offsets: IOffsetsStatement = {
    matchPercentage,
    maxDollarAmount,
    toBeMatched: {
      dollars: toBeMatched.dollars,
      tonnes: toBeMatched.tonnes,
    },
    totalMemberOffsets: {
      dollars: totalMemberOffsets.dollars,
      tonnes: totalMemberOffsets.tonnes,
    },
  };

  if (!!matched?.dollars) {
    _offsets.matched = {
      dollars: matched.dollars,
      tonnes: matched.tonnes,
      date: matched.date,
    };
  }

  return {
    _id,
    offsets: _offsets,
    date,
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
  let _group: IRef<Schema.Types.ObjectId, IShareableGroup | IGroup> = group;
  if (!!(_group as IGroupDocument)?.name) {
    _group = getShareableGroup(group as IGroupDocument);
  }

  return {
    _id,
    email,
    role,
    status,
    joinedOn,
    group: _group,
  };
};

export const getUserGroups = async (req: IRequest<IUserGroupsRequest>) => {
  const karmaAllowList = [UserRoles.Admin, UserRoles.SuperAdmin];
  const { userId } = req.params;
  try {
    if (!userId) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    if (req.requestor._id.toString() !== userId && !karmaAllowList.includes(req.requestor.role as UserRoles)) {
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

export const getUserGroup = async (req: IRequest<IUserGroupRequest>) => {
  const karmaAllowList = [UserRoles.Admin, UserRoles.SuperAdmin];
  const { userId, groupId } = req.params;
  try {
    if (req.requestor._id.toString() !== userId && !karmaAllowList.includes(req.requestor.role as UserRoles)) {
      throw new CustomError('You are not authorized to request this user\'s groups.', ErrorTypes.UNAUTHORIZED);
    }
    if (!userId) throw new CustomError('A user id is required', ErrorTypes.INVALID_ARG);
    if (!groupId) throw new CustomError('A group id is required', ErrorTypes.INVALID_ARG);
    // reassigning query if app user is present to ensure safety
    let query: { group: string, user?: string } = { group: groupId, user: userId };
    if (req.requestor._id.toString() === process.env.APP_USER_ID) {
      query = { group: groupId };
    }
    const userGroup = await UserGroupModel.findOne(query)
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
    if (!userGroup) throw new CustomError(`A group with id: ${groupId} could not be found.`, ErrorTypes.NOT_FOUND);
    return userGroup;
  } catch (e) {
    throw asCustomError(e);
  }
};

export const getSummary = async (_: IRequest) => {
  try {
    const groups = await GroupModel.find({});
    let privateGroups = 0;
    let protectedGroups = 0;
    let publicGroups = 0;
    let lockedGroups = 0;

    for (const group of groups) {
      if (group.status === GroupStatus.Locked) lockedGroups += 1;
      if (group.settings.privacyStatus === GroupPrivacyStatus.Private) privateGroups += 1;
      if (group.settings.privacyStatus === GroupPrivacyStatus.Protected) protectedGroups += 1;
      if (group.settings.privacyStatus === GroupPrivacyStatus.Public) publicGroups += 1;
    }

    return {
      total: groups.length,
      locked: lockedGroups,
      private: privateGroups,
      protected: protectedGroups,
      public: publicGroups,
    };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const joinGroup = async (req: IRequest<{}, {}, IJoinGroupRequest>) => {
  const karmaAllowList = [UserRoles.Admin, UserRoles.SuperAdmin];

  try {
    const { code, email, userId } = req.body;

    if (!code) throw new CustomError('A group code is required.', ErrorTypes.INVALID_ARG);
    if (!userId) throw new CustomError('No user specified to join this group.', ErrorTypes.INVALID_ARG);

    const group = await GroupModel.findOne({ code });
    if (!group) throw new CustomError(`A group was not found with code: ${code}`, ErrorTypes.NOT_FOUND);
    if (group.status === GroupStatus.Locked) throw new CustomError('This group is not accepting new members.', ErrorTypes.NOT_ALLOWED);

    let user: IUserDocument;
    if (userId === req.requestor._id.toString()) {
      user = req.requestor;
    } else {
      // requestor must be a Karma member to add another user to a group
      if (!karmaAllowList.includes(req.requestor.role as UserRoles)) throw new CustomError('You are not authorized to add another user to a group.', ErrorTypes.UNAUTHORIZED);
      user = await getUser(req, { _id: userId });
    }

    if (!user) throw new CustomError('User not found.', ErrorTypes.NOT_FOUND);

    // confirm that user has not been banned from group
    const existingUserGroups: IUserGroupDocument[] = await UserGroupModel
      .find({ group })
      .populate([
        {
          path: 'group',
          ref: GroupModel,
        },
      ]);

    const usersUserGroup = existingUserGroups.find(g => g.user.toString() === user._id.toString());

    if (usersUserGroup?.status === UserGroupStatus.Banned) {
      throw new CustomError('You are not authorized to join this group.', ErrorTypes.UNAUTHORIZED);
    }

    // TODO: status === Removed, check if needs approval to join again

    if (
      usersUserGroup?.status === UserGroupStatus.Unverified
      || usersUserGroup?.status === UserGroupStatus.Verified
      || usersUserGroup?.status === UserGroupStatus.Approved
    ) {
      throw new CustomError('You have already joined this group.', ErrorTypes.UNPROCESSABLE);
    }

    let validEmail: string;
    const hasDomainRestrictions = group.settings.allowDomainRestriction && group.domains.length > 0;
    if (hasDomainRestrictions) {
      if (!isemail.validate(email, { minDomainAtoms: 2 })) {
        throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
      }

      // ??? should we support falling back to existing user emails if the groupEmail does not
      // meet the groups requirements???
      // const validEmail = [groupEmail, user.email, ...(user.altEmails || [])].find(email => {
      const _validEmail = [email].find(e => !!group.domains.find(domain => e.split('@')[1] === domain));

      if (!_validEmail) throw new CustomError(`A valid email from ${group.domains.length > 1 ? 'one of ' : ''}the following domain${group.domains.length > 1 ? 's' : ''} is required to join this group: ${group.domains.join(', ')}`);
      validEmail = _validEmail;
    }

    const existingEmail = hasDomainRestrictions ? user?.emails?.find(e => e.email === validEmail) : user?.emails?.find(e => e.primary);
    // add groupEmail to user's list of emails
    // if doesnt already exist and
    // is not their primary email
    if (!existingEmail) {
      // check if any other user has email
      const usersWithEmail = await UserModel.find({ 'emails.email': validEmail });
      if (usersWithEmail?.length > 0) throw new CustomError('This email is already in use.', ErrorTypes.UNPROCESSABLE);
      user.emails.push({
        email: validEmail,
        status: UserEmailStatus.Unverified,
        primary: false,
      });
    }

    // send verification email if
    // group has domain restriction AND
    // email exists and is unverified or
    // doesnt already exist
    if (hasDomainRestrictions && ((existingEmail?.status === UserEmailStatus.Unverified) || !existingEmail)) {
      const token = await TokenService.createToken({
        user, days: emailVerificationDays, type: TokenTypes.Email, resource: { email: validEmail },
      });
      await sendGroupVerificationEmail({
        name: user.name, token: token.value, groupName: group.name, recipientEmail: validEmail,
      });
    }

    // if the email used already exists and has been verified
    // the role to Verified.
    const defaultStatus = existingEmail?.status === UserEmailStatus.Verified || !group.settings.allowDomainRestriction
      ? UserGroupStatus.Verified
      : UserGroupStatus.Unverified;

    let userGroup: IUserGroupDocument = null;
    if (!!usersUserGroup) {
      usersUserGroup.email = validEmail;
      usersUserGroup.role = UserGroupRole.Member;
      usersUserGroup.status = defaultStatus;

      await usersUserGroup.save();
    } else {
      userGroup = new UserGroupModel({
        user,
        group,
        email: validEmail,
        role: UserGroupRole.Member,
        status: defaultStatus,
      });

      await userGroup.save();
    }

    await user.save();

    return userGroup ?? usersUserGroup;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const leaveGroup = async (req: IRequest<IGroupRequestParams>) => {
  const { groupId } = req.params;

  try {
    if (!groupId) throw new CustomError('A group id is required.', ErrorTypes.INVALID_ARG);

    const userGroup = await UserGroupModel.findOne({
      group: groupId,
      user: req.requestor,
      status: { $nin: [UserGroupStatus.Removed, UserGroupStatus.Banned, UserGroupStatus.Left] },
    });

    // only a user that is a member of a group can leave it.
    // if someone else is removing the user, that should be
    // done with the updateUserGroup function instead and their
    // status should be set to Removed not Left.
    if (!userGroup) throw new CustomError('You are not a member of this group, so you cannot leave it.', ErrorTypes.UNPROCESSABLE);

    if (userGroup.role === UserGroupRole.Owner) {
      throw new CustomError('You are not allowed to leave this group because you are its owner.', ErrorTypes.UNPROCESSABLE);
    }

    // preserve any more severe statuses so they are not
    // overwritten with left status
    if (userGroup.status !== UserGroupStatus.Removed && userGroup.status !== UserGroupStatus.Banned) {
      userGroup.role = UserGroupRole.Member;
      userGroup.status = UserGroupStatus.Left;
      userGroup.lastModified = dayjs().utc().toDate();
    }

    await userGroup.save();
  } catch (err) {
    throw asCustomError(err);
  }
};

export const matchMemberOffsets = async (req: IRequest, matchData: IGroupOffsetMatchData) => {
  try {
    const {
      group,
      statements,
      totalAmountMatched,
      transactor,
    } = matchData;

    if (!totalAmountMatched) throw new CustomError('A total dollar amount matched is required.', ErrorTypes.INVALID_ARG);
    if (totalAmountMatched <= 0) throw new CustomError('The total dollar amount matched must be a positive amount.', ErrorTypes.INVALID_ARG);
    if (!transactor || (!transactor.user && !transactor.group)) throw new CustomError('The transactor is required.', ErrorTypes.INVALID_ARG);
    if (!!transactor.group && !isValidObjectId(transactor.group)) {
      throw new CustomError('Invalid transactor group found.', ErrorTypes.INVALID_ARG);
    }

    req.requestor = await UserModel.findOne({ _id: process.env.APP_USER_ID });

    // get the total that was to be matched for all statements
    const totalToBeMatched = statements.reduce((acc, curr) => curr.offsets.toBeMatched.dollars + acc, 0);

    let user: IUserDocument = null;

    if (!!transactor.user) {
      // have to account for old ui passing legacy id
      user = isValidObjectId(transactor.user)
        ? await UserModel.findOne({ _id: transactor.user })
        : await UserModel.findOne({ legacyId: transactor.user });

      if (!user) throw new CustomError(`Transactor user with id: ${transactor.user} could not be found.`, ErrorTypes.NOT_FOUND);
    }

    let percentageMatched = 1;

    if (totalToBeMatched > totalAmountMatched) {
      // the full amount to be matched was not met,
      // calculating the perventage for the amount that
      // was actually paid.
      percentageMatched = totalAmountMatched / totalToBeMatched;
    }

    const timestamp = dayjs().utc().toDate();
    for (const statement of statements) {
      const dollarsMatched = statement.offsets.toBeMatched.dollars * percentageMatched;
      const tonnesMatched = statement.offsets.toBeMatched.tonnes * percentageMatched;

      const matched = {
        dollars: dollarsMatched,
        tonnes: tonnesMatched,
        date: timestamp,
        transactor: { user, group },
      };

      statement.offsets.matched = matched;
      await statement.save();

      for (const toBeMatchedTransaction of statement.offsets.toBeMatched.transactions) {
        const { value, transaction } = toBeMatchedTransaction;

        const valueMatched = value * percentageMatched;

        const matchedTransaction: ITransactionMatch = {
          amount: valueMatched,
          date: timestamp,
          matcher: { user, group },
          status: true,
        };

        (transaction as ITransactionDocument).matched = matchedTransaction;
        await (transaction as ITransactionDocument).save();
      }
    }

    // TODO: send email to members letting them know the group has matched their transactions?
    //   - if we do this, we should probably re-run the group member data job so shows live data
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updateGroup = async (req: IRequest<IGroupRequestParams, {}, IGroupRequestBody>) => {
  const karmaAllowList = [UserRoles.Admin, UserRoles.SuperAdmin];
  const { groupId } = req.params;
  const {
    owner,
    name,
    code,
    logo,
    status,
    settings,
    domains,
  } = req.body;
  try {
    if (!groupId) throw new CustomError('A group id is required.', ErrorTypes.INVALID_ARG);

    if (!owner && !name && !code && !logo && !status && !settings && !domains) {
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
    if (!!userGroup) {
      if (userGroup.role === UserGroupRole.Member && !karmaAllowList.includes(req.requestor.role as UserRoles)) {
        throw new CustomError('You are not authorized to update this group.', ErrorTypes.UNAUTHORIZED);
      }
    } else {
      if (!karmaAllowList.includes(req.requestor.role as UserRoles)) {
        throw new CustomError('You are not authorized to update this group.', ErrorTypes.UNAUTHORIZED);
      }
    }

    if (!!owner && owner !== (group.owner as IUserDocument)._id.toString()) {
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
        ownerUserGroup.lastModified = dayjs().utc().toDate();
      } else {
        // create new user group
        ownerUserGroup = new UserGroupModel({
          group,
          user: group.owner,
          email: group.owner.email,
          role: UserGroupRole.Owner,
          status: UserGroupStatus.Verified,
          joinedOn: dayjs().utc().toDate(),
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

    if (!!logo) {
      if (!logo.includes(`group/${group._id}`)) {
        throw new CustomError('Invalid logo url found. Please upload image first, then use returned url.', ErrorTypes.INVALID_ARG);
      }

      group.logo = logo;
    }

    if (!!status && group.status !== status) {
      if (!Object.values(GroupStatus).includes(status)) {
        throw new CustomError('Invalid group status.', ErrorTypes.INVALID_ARG);
      }

      // only the owner of the group, and karma members, may change the a groups status
      if (!karmaAllowList.includes(req.requestor.role as UserRoles) && userGroup.role !== UserGroupRole.Owner) {
        throw new CustomError('You are not authorized to update this group\'s status.', ErrorTypes.UNAUTHORIZED);
      }

      group.status = status;
    }

    if (!!settings) {
      group.settings = verifyGroupSettings(settings, (group.toObject()).settings);
    }

    if (!!domains) group.domains = verifyDomains(domains, !!group.settings.allowDomainRestriction);

    group.lastModified = dayjs().utc().toDate();

    await group.save();
    return group;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updateUserGroup = async (req: IRequest<IUpdateUserGroupRequestParams, {}, IUpdateUserGroupRequestBody>, internalOverride = false) => {
  const karmaAllowList = [UserRoles.Admin, UserRoles.SuperAdmin];
  const { userId, groupId } = req.params;
  const { email, role, status } = req.body;

  try {
    if (!groupId) throw new CustomError('A group id is required.', ErrorTypes.INVALID_ARG);
    if (!userId) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);

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

    const userGroup = userGroups.find(u => (u.user as IUserDocument)._id.toString() === userId);
    const requestorUserGroup = userGroups.find(u => (u.user as IUserDocument)._id.toString() === req.requestor._id.toString());

    if (!userGroup) throw new CustomError(`A group with id: ${groupId} was not found for this user.`, ErrorTypes.NOT_FOUND);
    if (!karmaAllowList.includes(req.requestor.role as UserRoles) && !requestorUserGroup) {
      throw new CustomError('You are not allowed to make this request.', ErrorTypes.UNAUTHORIZED);
    }

    // make array of the user group roles so can use the index as a score to be compared to.
    const userGroupRoleScores = [UserGroupRole.Member, UserGroupRole.Admin, UserGroupRole.SuperAdmin, UserGroupRole.Owner];

    if (!!email) {
      // only the user or a karma member can update the email
      if (req.requestor._id.toString() !== (userGroup.user as IUserDocument)._id.toString() && !karmaAllowList.includes(req.requestor.role as UserRoles)) {
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

      if (req.requestor._id.toString() === userId) throw new CustomError('You are not allowed to change your own role within this group.', ErrorTypes.UNAUTHORIZED);

      if (!!requestorUserGroup) {
        // roll is not allowed to be updated if requestor is not a karma member, and they have an equal
        // or lesser role than the user being updated
        //
        // example, if the person making the request is an admin for a group, they cannot change the role
        // of another admin within that group. only the owner or a superadmin would be able to do that.
        if (!karmaAllowList.includes(req.requestor.role as UserRoles) && origUserGroupRoleScore >= requestorGroupRoleScore) {
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
        if (req.requestor._id.toString() !== userId) {
          throw new CustomError('You are not authorized to update this user\'s status.', ErrorTypes.UNAUTHORIZED);
        }
      }

      if (status === UserGroupStatus.Removed || status === UserGroupStatus.Banned) {
        if (userGroup.role === UserGroupRole.Owner) {
          throw new CustomError('You cannot remove or ban the owner of a group.', ErrorTypes.UNPROCESSABLE);
        }

        if (req.requestor._id.toString() === userId) {
          throw new CustomError('You are not allowed to remove or ban yourself from a group. Try Leaving a group instead.', ErrorTypes.NOT_ALLOWED);
        }

        if (!!requestorUserGroup && !karmaAllowList.includes(req.requestor.role as UserRoles) && origUserGroupRoleScore >= requestorGroupRoleScore) {
          throw new CustomError('You are not authorized to remove or ban this user.', ErrorTypes.UNAUTHORIZED);
        }
      }

      if (status === UserGroupStatus.Approved) {
        if (!!requestorUserGroup && !karmaAllowList.includes(req.requestor.role as UserRoles) && origUserGroupRoleScore >= requestorGroupRoleScore) {
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

export const updateUserGroups = async (req: IRequest<IGroupRequestParams, {}, IUpdateUserGroupsRequestBody>) => {
  const karmaAllowList = [UserRoles.Admin, UserRoles.SuperAdmin];
  const { groupId } = req.params;
  const {
    status,
    memberIds = [],
  } = req.body;

  try {
    if (!groupId) throw new CustomError('A group id is required.', ErrorTypes.INVALID_ARG);

    // verify that at least 1 batch update supported property
    // has been passed
    //
    // currently, we only support batch status updates...but adding
    // here in case this is updated in the future and we allow
    // different types of batch updates.
    if (!status) throw new CustomError('No updatable data found.', ErrorTypes.INVALID_ARG);

    if (status) {
      if (!Object.values(UserGroupStatus).find(s => s === status)) {
        throw new CustomError('Invalid status found.', ErrorTypes.INVALID_ARG);
      }
    }

    const userGroups = await UserGroupModel.find({
      user: req.requestor,
      group: groupId,
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

    const requestorUserGroup = userGroups.find(u => (u.user as IUserDocument)._id.toString() === req.requestor._id.toString());

    if (
      !karmaAllowList.includes(req.requestor.role as UserRoles)
      && (
        !requestorUserGroup
        || (
          requestorUserGroup.role !== UserGroupRole.Admin
          && requestorUserGroup.role !== UserGroupRole.SuperAdmin
          && requestorUserGroup.role !== UserGroupRole.Owner
        )
      )
    ) {
      // user must be a karma member, or an admin or higher to make this request
      throw new CustomError('You are not allowed to make this request.', ErrorTypes.UNAUTHORIZED);
    }

    let rolesRequestorIsAllowedToUpdate: UserGroupRole[];

    if (requestorUserGroup.role === UserGroupRole.SuperAdmin && rolesRequestorIsAllowedToUpdate.length === 1) {
      rolesRequestorIsAllowedToUpdate = [UserGroupRole.Member, UserGroupRole.Admin];
    }

    if (requestorUserGroup.role === UserGroupRole.Owner) {
      rolesRequestorIsAllowedToUpdate = [UserGroupRole.Member, UserGroupRole.Admin, UserGroupRole.SuperAdmin];
    }

    if (req.requestor.role === UserRoles.Admin || req.requestor.role === UserRoles.SuperAdmin) {
      rolesRequestorIsAllowedToUpdate = [UserGroupRole.Member, UserGroupRole.Admin, UserGroupRole.SuperAdmin, UserGroupRole.Owner];
    }

    const query: FilterQuery<IUserGroup> = {
      $and: [
        { role: { $in: rolesRequestorIsAllowedToUpdate } },
        { group: groupId },
      ],
    };

    // if no memberIds are specified, then will attempt to update
    // ALL members that the requestor is allowed to update
    if (memberIds?.length) {
      query.$and.push({ user: { $in: memberIds.filter(id => id !== req.requestor._id) } });
    } else {
      query.$and.push({ user: { $ne: req.requestor._id } });
    }

    const memberUserGroups = await UserGroupModel.find(query);

    if (memberIds?.length && memberUserGroups.length !== memberIds.length) {
      // at least 1 id was included that the requestor is not allowed to update
      throw new CustomError(
        'You are not allowed to update all of these users. Please check the list of members to be updated and try again.',
        ErrorTypes.UNAUTHORIZED,
      );
    }

    const timestamp = dayjs().utc().toDate();

    const update: UpdateQuery<IUserGroup> = {
      status,
      lastModified: timestamp,
    };
    await UserGroupModel.updateMany(query, update);
    const updatedMemberUserGroups = await UserGroupModel.find(query);

    // TODO: verify that all user groups were updated?
    // TODO: add to change log for group for record keeping and maintenance

    return updatedMemberUserGroups;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getGroupOffsetData = async (req: IRequest<IGetGroupOffsetRequestParams>, bustCache = false) => {
  const { requestor } = req;
  const { groupId } = req.params;
  try {
    if (!groupId) {
      throw new CustomError('A group id is required', ErrorTypes.INVALID_ARG);
    }
    const userGroupPromise = getUserGroup({ ...req, params: { userId: requestor._id.toString(), groupId: req.params.groupId } });
    const membersPromise = getAllGroupMembers(req);
    const [userGroup, members] = await Promise.all([userGroupPromise, membersPromise]);

    const memberDonations = {
      dollars: 0,
      tonnes: 0,
    };

    let membersWithDonations = 0;

    const cachedDataKey = getGroupOffsetDataKey(groupId);
    let cachedData = await getCachedData(cachedDataKey);

    if (!cachedData || bustCache) {
      for (const member of members) {
        const query = { userId: (member.user as IUserDocument)._id, date: { $gte: member.joinedOn } };
        const donationsTotalDollarsPromise = getOffsetTransactionsTotal(query);
        const donationsTotalTonnesPromise = getRareOffsetAmount(query);

        const [donationsTotalDollars, donationsTotalTonnes] = await Promise.all([donationsTotalDollarsPromise, donationsTotalTonnesPromise]);

        if (donationsTotalDollars > 0) {
          membersWithDonations += 1;
        }

        memberDonations.dollars += donationsTotalDollars;
        memberDonations.tonnes += donationsTotalTonnes;
      }

      const groupTransactionQuery = { matchType: MatchTypes.Offset, 'association.group': (userGroup.group as IGroupDocument)._id };

      const groupDonationsTotalDollarsPromise = getOffsetTransactionsTotal(groupTransactionQuery);
      const groupDonationsTotalTonnesPromise = getRareOffsetAmount(groupTransactionQuery);

      const [groupDonationsTotalDollars, groupDonationsTotalTonnes] = await Promise.all([groupDonationsTotalDollarsPromise, groupDonationsTotalTonnesPromise]);

      const groupDonations = {
        dollars: groupDonationsTotalDollars,
        tonnes: groupDonationsTotalTonnes,
      };

      const totalDonations = {
        dollars: memberDonations.dollars + groupDonations.dollars,
        tonnes: memberDonations.tonnes + groupDonations.tonnes,
      };

      const cachedDataValue = {
        membersWithDonations,
        groupDonations,
        memberDonations,
        totalDonations,
      };

      cachedData = await createCachedData({ key: cachedDataKey, value: cachedDataValue });
    }

    return {
      userGroup,
      members: members.length,
      ...cachedData.value,
      lastUpdated: cachedData.lastUpdated,
    };
  } catch (e) {
    throw asCustomError(e);
  }
};

export const getGroupOffsetEquivalency = async (req: IRequest<IGetGroupOffsetRequestParams>) => {
  const { groupId } = req.params;
  if (!groupId) {
    throw new CustomError('A group id is required', ErrorTypes.INVALID_ARG);
  }
  try {
    const { totalDonations } = await getGroupOffsetData(req);

    const averageAmericanEmissions = {
      monthly: averageAmericanEmissionsData.Monthly,
      annually: averageAmericanEmissionsData.Annually * 2,
    };

    const useAverageAmericanEmissions = !totalDonations.tonnes;

    let equivalency: IEquivalencyObject;

    const equivalencies = getEquivalencies(useAverageAmericanEmissions ? averageAmericanEmissions.annually : totalDonations.tonnes);

    if (useAverageAmericanEmissions) {
      equivalency = equivalencies.negative[getRandomInt(0, equivalencies.negative.length - 1)];
    } else {
      equivalency = equivalencies.positive[getRandomInt(0, equivalencies.positive.length - 1)];
    }

    return {
      useAverageAmericanEmissions,
      totalDonations,
      equivalency,
      averageAmericanEmissions,
    };
  } catch (e) {
    throw asCustomError(e);
  }
};
