import { FilterQuery } from 'mongoose';
import { ErrorTypes, UserRoles } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { GroupModel } from '../../models/group';
import { IStatement, StatementModel } from '../../models/statement';
import { UserModel } from '../../models/user';
import { IRequest } from '../../types/request';

/**
 * !!! IMPORTANT !!!
 *
 * this function is intended for internal use only
 * and should not be used outside of api.
 * anything ui facing should use `getStatements`
 * instead since it returns a paginated response.
 */
export const getAllStatements = (req: IRequest, query: FilterQuery<IStatement> = {}) => {
  const karmaAllowList = [UserRoles.Admin, UserRoles.SuperAdmin];

  if (!karmaAllowList.includes(req.requestor.role as UserRoles)) {
    throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);
  }

  return StatementModel.find(query);
};

/**
 * this function relies on the calling function to handle
 * any authorization for statement access.
 */
export const getStatements = (_: IRequest, query: FilterQuery<IStatement>) => {
  const options = {
    projection: query?.projection || '',
    populate: query.population || [
      {
        path: 'user',
        model: UserModel,
      },
      {
        path: 'group',
        model: GroupModel,
      },
    ],
    lean: true,
    page: query?.skip || 1,
    sort: query?.sort ? { date: 1, ...query.sort } : { date: 1 },
    limit: query?.limit || 10,
  };
  return StatementModel.paginate(query.filter, options);
};
