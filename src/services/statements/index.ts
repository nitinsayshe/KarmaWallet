import { FilterQuery } from 'mongoose';
import { GroupModel } from '../../models/group';
import { IStatement, StatementModel } from '../../models/statement';
import { UserModel } from '../../models/user';
import { IRequest } from '../../types/request';

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
