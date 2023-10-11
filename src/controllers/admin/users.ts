import aqp from 'api-query-params';
import { ObjectId } from 'mongoose';
import { asCustomError } from '../../lib/customError';
import { IUser } from '../../models/user';
import * as output from '../../services/output';
import * as UserService from '../../services/user';
import * as UserTestIdentityService from '../../services/user/testIdentities';
import * as UserUtilitiesService from '../../services/user/utils';
import { IRef } from '../../types/model';
import { IRequestHandler } from '../../types/request';

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
    UserTestIdentityService.triggerResetTestIdentities();
    output.api(req, res, 'Reset test identities job has been queued for execution.');
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const unlockAccount: IRequestHandler<{ user: IRef<ObjectId, IUser> }, {}, {}> = async (req, res) => {
  try {
    await UserUtilitiesService.unlockAccount(req);
    output.api(req, res, 'Account successfully unlocked');
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
