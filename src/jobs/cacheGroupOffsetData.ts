import { SandboxedJob } from 'bullmq';
import { GroupModel } from '../models/group';
import { JobNames } from '../lib/constants/jobScheduler';
import { getGroupOffsetData, IGetGroupOffsetRequestParams } from '../services/groups';
import { IRequest } from '../types/request';
import { UserModel } from '../models/user';
import { asCustomError } from '../lib/customError';
import { UserGroupModel } from '../models/userGroup';

/**
 * iterates over all groups and caches offsetdata
 */

export const exec = async () => {
  const groups = await GroupModel.find({});
  for (const group of groups) {
    try {
      // finds any user in the group to bypass checks
      const userGroup = await UserGroupModel.findOne({ group });
      const user = await UserModel.findOne({ _id: userGroup.user });
      const mockRequest = ({
        requestor: user,
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
