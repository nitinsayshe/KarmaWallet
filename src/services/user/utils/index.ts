import { AxiosInstance } from 'axios';
import { FilterQuery, ObjectId, PaginateResult, Types } from 'mongoose';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';
import { ErrorTypes } from '../../../lib/constants';
import CustomError, { asCustomError } from '../../../lib/customError';
import { getUtcDate } from '../../../lib/date';
import { sleep } from '../../../lib/misc';
import { KWRateLimiterKeyPrefixes, unblockEmailFromLimiter } from '../../../middleware/rateLimiter';
import { IProductSubscription } from '../../../models/productSubscription/types';
import { IUserDocument, UserModel } from '../../../models/user';
import { VisitorModel, IVisitorDocument } from '../../../models/visitor';
import { UserLogModel } from '../../../models/userLog';
import { IUser, IUserIntegrations, KarmaMembershipStatusEnumValues, IKarmaMembershipData } from '../../../models/user/types';
import { IRef } from '../../../types/model';
import { IRequest } from '../../../types/request';
import { IEntityData } from '../types';

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

export const isUserDocument = (entity: any): entity is IUserDocument => (
  (<IUserDocument>entity).emails !== undefined
    && (<IUserDocument>entity).password !== undefined
    && (<IUserDocument>entity).name !== undefined
    && (<IUserDocument>entity).role !== undefined
);

export const isExistingWebAppUser = (user: IUserDocument) => !!user?.integrations?.marqeta && dayjs(user?.integrations?.marqeta?.created_time).subtract(12, 'hour').isAfter(dayjs(user.dateJoined));

export const returnUserOrVisitorFromEmail = async (email: string): Promise<IEntityData> => {
  const user = await UserModel.findOne({ 'emails.email': email });
  const visitor = await VisitorModel.findOne({ email });

  if (!visitor && !user) {
    throw new CustomError(`User or Visitor not found with email ${email}`, ErrorTypes.NOT_FOUND);
  }
  if (!!user) {
    return {
      type: 'user',
      data: user,
    };
  }
  return {
    type: 'visitor',
    data: visitor,
  };
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
  karmaMembership,
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
      phone: integrations.marqeta.phone || '',
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
    karmaMembership,
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

export const addKarmaMembershipToUser = async (
  user: IUserDocument,
  membershipType: IProductSubscription,
  status: KarmaMembershipStatusEnumValues,
) => {
  try {
    const newMembership: IKarmaMembershipData = {
      productSubscription: membershipType._id,
      status,
      lastModified: getUtcDate().toDate(),
      startDate: getUtcDate().toDate(),
    };

    user.karmaMembership = newMembership;
    const savedUser = await user.save();
    return savedUser;
  } catch (err) {
    console.error(
      `Error adding karma membership data ${membershipType} to user  ${user._id} : ${err}`,
    );
    if ((err as CustomError)?.isCustomError) {
      throw err;
    }
    throw new CustomError('Error subscribing user to karma membership', ErrorTypes.SERVER);
  }
};

export const storeNewLogin = async (userId: string, loginDate: Date, authKey: string) => {
  await UserLogModel.findOneAndUpdate({ userId, date: loginDate }, { date: loginDate, authKey }, { upsert: true }).sort({
    date: -1,
  });
};

export const getEmailFromUserOrVisitor = (entity: IUserDocument | IVisitorDocument): string => {
  if (!entity) return null;
  if (isUserDocument(entity)) {
    return entity.emails.find((email) => email.primary)?.email;
  }
  return entity.email;
};
