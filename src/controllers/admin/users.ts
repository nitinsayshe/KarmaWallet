import aqp from 'api-query-params';
import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as UserService from '../../services/user';
import { asCustomError } from '../../lib/customError';
import * as UserTestIdentityService from '../../services/user/testIdentities';

export const getUsersPaginated: IRequestHandler = async (req, res) => {
  try {
    const reqQuery = aqp(req.query, { skipKey: 'page' });
    const query = {
      ...reqQuery,
    };

    const queryEntries = Object.entries(reqQuery.filter);

    if (queryEntries.length) {
      query.filter = {
        $and: [...queryEntries.map(([key, value]) => ({ [key]: value }))],
      };
    }

    const results = await UserService.getUsersPaginated(req, query);

    output.api(req, res, {
      ...results,
      docs: results.docs.map((d) => UserService.getShareableUser(d)),
    });
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const deleteUser: IRequestHandler<{}, { userId: string }, {}> = async (req, res) => {
  try {
    await UserService.deleteUser(req);
    output.api(req, res, 'Success');
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const resetTestIdentities: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    await UserTestIdentityService.deleteTestIdentites();
    const data = await UserTestIdentityService.createTestIdentities();
    output.api(
      req,
      res,
      Object.values(data)?.map((d) => UserService.getShareableUser(d)),
    );
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
