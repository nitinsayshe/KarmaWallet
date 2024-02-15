import { AxiosInstance } from 'axios';
import { FilterQuery, ObjectId, PaginateResult, Types } from 'mongoose';
import { ErrorTypes } from '../../../lib/constants';
import CustomError from '../../../lib/customError';
import { sleep } from '../../../lib/misc';
import { KWRateLimiterKeyPrefixes, unblockEmailFromLimiter } from '../../../middleware/rateLimiter';
import { IUser, IUserDocument, UserModel } from '../../../models/user';
import { IRef } from '../../../types/model';
import { IRequest } from '../../../types/request';

export type UserIterationRequest<T> = {
  httpClient?: AxiosInstance;
  batchQuery: FilterQuery<IUser>;
  batchLimit: number;
  fields?: T;
};

export type UserIterationResponse<T> = {
  userId: Types.ObjectId;
  fields?: T;
};

export const iterateOverUsersAndExecWithDelay = async <Req, Res>(
  request: UserIterationRequest<Req>,
  exec: (req: UserIterationRequest<Req>, userBatch: PaginateResult<IUserDocument>) => Promise<UserIterationResponse<Res>[]>,
  msDelayBetweenBatches: number,
): Promise<UserIterationResponse<Res>[]> => {
  let report: UserIterationResponse<Res>[] = [];

  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const userBatch = await UserModel.paginate(request.batchQuery, {
      page,
      limit: request.batchLimit,
    });

    console.log('total users matching query: ', userBatch.totalDocs);
    const userReports = await exec(request, userBatch);

    console.log(`Prepared ${userReports.length} user reports`);
    report = report.concat(userReports);

    await sleep(msDelayBetweenBatches);

    hasNextPage = userBatch?.hasNextPage || false;
    page++;
  }
  return report;
};

export const checkIfUserWithEmailExists = async (email: string) => {
  const userExists = await UserModel.findOne({ 'emails.email': email });
  return !!userExists;
};

export const unlockAccount = async (req: IRequest<{ user: IRef<ObjectId, IUser> }, {}, {}>): Promise<void> => {
  try {
    let { user } = req.params;
    // lookup user's primary email
    user = await UserModel.findById(user).lean();
    const email = (user as IUser)?.emails?.find((e) => e?.primary)?.email;
    if (!(user as IUser)?.dateJoined || !email) {
      throw new CustomError(`Error finding an email for userId: ${user}`, ErrorTypes.SERVER);
    }

    // unlock the login rate limiter for that email
    await unblockEmailFromLimiter(req, email, KWRateLimiterKeyPrefixes.Login);
  } catch (err) {
    console.error(err);
    if ((err as CustomError)?.isCustomError) {
      throw err;
    }
    throw new CustomError('Error unlocking account', ErrorTypes.SERVER);
  }
};
