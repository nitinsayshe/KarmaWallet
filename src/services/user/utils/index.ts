import { AxiosInstance } from 'axios';
import { FilterQuery, ObjectId, PaginateResult, Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { ErrorTypes } from '../../../lib/constants';
import CustomError, { asCustomError } from '../../../lib/customError';
import { sleep } from '../../../lib/misc';
import { KWRateLimiterKeyPrefixes, unblockEmailFromLimiter } from '../../../middleware/rateLimiter';
import { IUser, IUserDocument, IUserIntegrations, UserModel } from '../../../models/user';
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

export const getShareableUser = ({
  _id,
  email,
  emails,
  name,
  dateJoined,
  zipcode,
  role,
  legacyId,
  integrations,
}: IUserDocument) => {
  const _integrations: Partial<IUserIntegrations> = {};
  if (integrations?.paypal) _integrations.paypal = integrations.paypal;
  if (integrations?.shareasale) _integrations.shareasale = integrations.shareasale;
  if (integrations?.marqeta) {
    _integrations.marqeta = {
      userToken: integrations.marqeta.userToken,
      email: integrations.marqeta.email,
      first_name: integrations.marqeta.first_name,
      last_name: integrations.marqeta.last_name,
      city: integrations.marqeta.city,
      postal_code: integrations.marqeta.postal_code,
      state: integrations.marqeta.state,
      address1: integrations.marqeta.address1,
      address2: integrations.marqeta.address2 || '',
      country: integrations.marqeta.country,
      status: integrations.marqeta.status,
      reason: integrations?.marqeta?.reason || '',
      reason_code: integrations?.marqeta?.reason_code || '',
    };
  }
  if (integrations?.fcm) _integrations.fcm = integrations.fcm;
  return {
    _id,
    email,
    emails,
    name,
    dateJoined,
    zipcode,
    role,
    legacyId,
    integrations: _integrations,
  };
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

export const getUser = async (_: IRequest, query = {}) => {
  try {
    const user = await UserModel.findOne(query);

    if (!user) throw new CustomError('User not found', ErrorTypes.NOT_FOUND);

    return user;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const createShareasaleTrackingId = async () => {
  let uniqueId = nanoid();
  let existingTrackingId = await UserModel.findOne({ 'integrations.shareasale.trackingId': uniqueId });

  while (existingTrackingId) {
    uniqueId = nanoid();
    existingTrackingId = await UserModel.findOne({ 'integrations.shareasale.trackingId': uniqueId });
  }

  return uniqueId;
};
