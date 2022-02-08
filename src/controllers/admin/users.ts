import aqp from 'api-query-params';
import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as UserService from '../../services/user';
import { asCustomError } from '../../lib/customError';

export const getUsers: IRequestHandler = async (req, res) => {
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

    const results = await UserService.getUsers(req, query);

    output.api(req, res, {
      ...results,
      docs: results.docs.map(d => UserService.getSharableUser(d)),
    });
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
