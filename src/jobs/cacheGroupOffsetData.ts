import { SandboxedJob } from 'bullmq';
import { GroupModel } from '../models/group';
import { JobNames } from '../lib/constants/jobScheduler';
import { getGroupOffsetData, IGetGroupOffsetRequestParams } from '../services/groups';
import { IRequest } from '../types/request';
import { UserModel } from '../models/user';
import { asCustomError } from '../lib/customError';

/**
 * iterates over all groups and caches offsetdata
 */

export const exec = async () => {
  const appUser = await UserModel.findOne({ _id: '6241e2260c9177f79772fdc5' });
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
