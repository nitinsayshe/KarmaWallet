import { ErrorTypes, UserRoles } from '../../lib/constants';
import { DOMAIN_REGEX } from '../../lib/constants/regex';
import CustomError, { asCustomError } from '../../lib/customError';
import {
  IGroupDocument, GroupModel, IShareableGroup, IGroupSettings, GroupPrivacyStatus,
} from '../../models/group';
import { UserModel } from '../../models/user';
import { IRequest } from '../../types/request';

export interface IGetGroupRequest {
  code?: string;
  name?: string;
}

export interface ICreateGroupRequest {
  owner?: string; // the id of the owner
  name: string;
  code: string;
  settings: IGroupSettings;
  domains: string[];
}

export const getShareableGroup = ({
  _id,
  name,
  code,
  domains,
  settings,
  owner,
  lastModified,
  createdOn,
}: IGroupDocument): (IShareableGroup & { _id: string }) => ({
  _id,
  name,
  code,
  domains,
  settings,
  owner,
  lastModified,
  createdOn,
});

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

export const getGroup = async (req: IRequest<{}, IGetGroupRequest>) => {
  try {
    const { code, name } = req.query;
    if (!code && !name) throw new CustomError('Group name or code is required.', ErrorTypes.INVALID_ARG);

    const query: IGetGroupRequest = {};

    if (!!code) query.code = code;
    if (!!name) query.name = name;

    const group = await GroupModel.findOne(query);

    if (!group) throw new CustomError(`A group with id: ${code} could not be found.`, ErrorTypes.NOT_FOUND);

    return group;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const verifyDomains = (domains: string[], allowDomainRestriction: boolean) => {
  if (!allowDomainRestriction) throw new CustomError('In order to support restricting email domains, you must first enable the `allow restricted domains` setting.', ErrorTypes.NOT_ALLOWED);

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

    if (!!domains) group.domains = verifyDomains(domains, !!group.settings.allowDomainRestriction);

    if (!!owner) {
      // requestor must have appropriate permissions to assign a group owner.
      if (req.requestor.role === UserRoles.None) throw new CustomError('You do not authorized to assign an owner to a group.', ErrorTypes.UNAUTHORIZED);
      const _owner = await UserModel.findOne({ _id: owner });
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
