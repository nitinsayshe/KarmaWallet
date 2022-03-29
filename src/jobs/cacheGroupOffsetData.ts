import { SandboxedJob } from 'bullmq';
import { GroupModel } from '../models/group';
import { JobNames } from '../lib/constants/jobScheduler';
import { getGroupOffsetData, IGetGroupOffsetRequestParams } from '../services/groups';
import { IRequest } from '../types/request';
import { UserModel } from '../models/user';
import CustomError, { asCustomError } from '../lib/customError';
import { ErrorTypes } from '../lib/constants';

/**
 * iterates over all groups and caches offsetdata
 */

export const exec = async () => {
  const { APP_USER_ID } = process.env;
  if (!APP_USER_ID) throw new CustomError('AppUserId not found', ErrorTypes.SERVICE);
  const appUser = await UserModel.findOne({ _id: APP_USER_ID });
  if (!appUser) throw new CustomError('AppUser not found', ErrorTypes.SERVICE);
  const groups = await GroupModel.find({});
  for (const group of groups) {
    try {
      const mockRequest = ({
        requestor: appUser,
        authKey: '',
        params: { groupId: group._id.toString() },
      } as IRequest<IGetGroupOffsetRequestParams, {}, {}>);
      await getGroupOffsetData(mockRequest, true);
    } catch (err) {
      throw asCustomError(err);
    }
  }
  return 'Group offset data successfully cached';
};

export const onComplete = () => {
  console.log(`${JobNames.CacheGroupOffsetData} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.CacheGroupOffsetData} failed`);
  console.log(err);
};
