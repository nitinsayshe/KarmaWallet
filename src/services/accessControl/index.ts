import { FilterQuery } from 'mongoose';
import { ErrorTypes, UserRoles } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { IUser } from '../../models/user/types';
import { IRequest } from '../../types/request';
import * as UserService from '../user';

export const getUsersPaginated = (req: IRequest, query: FilterQuery<IUser>) => {
  const _query = {
    ...query,
    filter: {
      $and: [
        ...Object.entries(query.filter).map(([key, value]) => ({ [key]: value })),
        { email: { $regex: '@theimpactkarma.com' } }, // only users with an impactkarma email
      ],
    },
  };

  return UserService.getUsersPaginated(req, _query);
};

export const getSummary = async (req: IRequest) => {
  const allMembers = await UserService.getUsersPaginated(req, { filter: { $and: [{ role: { $exists: true } }, { role: { $ne: UserRoles.None } }] } });

  const summary = {
    totalMembers: 0,
    totalAdmin: 0,
    totalSuperAdmin: 0,
  };

  for (const member of allMembers.docs) {
    summary[member.role === UserRoles.Member ? 'totalMembers' : member.role === UserRoles.Admin ? 'totalAdmin' : 'totalSuperAdmin'] += 1;
  }

  return summary;
};

export const getAssignableRoles = (req: IRequest) => {
  // only admin and superadmin are able to assign roles...everyone else will get []
  if (req.requestor.role !== UserRoles.Admin && req.requestor.role !== UserRoles.SuperAdmin) return [];

  // only super admin can assign all roles
  if (req.requestor.role === UserRoles.SuperAdmin) return Object.values(UserRoles);

  // admin cannot assign admin permissions or greater
  return Object.values(UserRoles).filter(role => role !== UserRoles.Admin && role !== UserRoles.SuperAdmin);
};

export const updateUserRole = async (req: IRequest, userId: string, newRole: UserRoles) => {
  try {
    if (req.requestor._id === userId) return { error: 'You cannot change your own role.', code: 403 };

    let user = await UserService.getUserById(req, userId);
    if (!user) throw new CustomError('User not found.', ErrorTypes.NOT_FOUND);
    const role = Object.values(UserRoles).find(r => r === newRole);
    if (!role) throw new CustomError(`Invalid role: ${newRole}`, ErrorTypes.INVALID_ARG);

    if (req.requestor.role === UserRoles.Admin) {
      if (user.role === UserRoles.Admin || user.role === UserRoles.SuperAdmin) {
        return { error: 'You are not authorized to change this user\'s role.', code: 403 };
      }

      if (role !== UserRoles.None && role !== UserRoles.Member) {
        return { error: 'You are not authorized to grant this role.', code: 403 };
      }
    }

    user = await UserService.updateUser(req, user, { role });
    if (!user) throw new CustomError('User not found', ErrorTypes.NOT_FOUND);
    return user;
  } catch (err) {
    throw asCustomError(err);
  }
};
