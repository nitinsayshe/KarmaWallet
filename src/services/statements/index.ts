import { FilterQuery, isValidObjectId } from 'mongoose';
import { ErrorTypes, UserRoles } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { GroupModel, IGroupDocument } from '../../models/group';
import { IStatement, StatementModel } from '../../models/statement';
import { TransactionModel } from '../../models/transaction';
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

export const validateStatementList = async (req: IRequest, statementIds: string[], group?: IGroupDocument) => {
  if (!statementIds) throw new CustomError('At least one statement id is required.', ErrorTypes.INVALID_ARG);
  if (!Array.isArray(statementIds)) throw new CustomError('Invalid statement id(s). Must be an array of ids.', ErrorTypes.INVALID_ARG);
  if (!statementIds.length) throw new CustomError('At least one statement id is required.', ErrorTypes.INVALID_ARG);
  const invalidStatementIds = statementIds.filter(s => !isValidObjectId(s));
  if (invalidStatementIds.length) throw new CustomError(`The follow statement ids are invalid: ${invalidStatementIds.join(', ')}.`, ErrorTypes.INVALID_ARG);

  const statementQuery: FilterQuery<IStatement> = {
    $and: [
      { _id: { $in: statementIds } },
      { offsets: { $exists: true } },
    ],
  };

  if (group) {
    statementQuery.$and.push({ group });
  }

  const statements = await getAllStatements(req, statementQuery)
    .populate([
      {
        path: 'group',
        model: GroupModel,
      },
      {
        path: 'offsets.toBeMatched.transactions.transaction',
        model: TransactionModel,
      },
    ]);

  if (statements.length !== statementIds.length) {
    const missingStatementIds = statementIds.filter(s => !statements.find(ss => ss._id.toString() === s));
    throw new CustomError(`The follow statements could not be found: ${missingStatementIds.join(', ')}`, ErrorTypes.INVALID_ARG);
  }

  return statements;
};
