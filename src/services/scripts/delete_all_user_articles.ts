import { PaginateResult } from 'mongoose';
import { IUserDocument } from '../../models/user';
import { iterateOverUsersAndExecWithDelay, IterationRequest, IterationResponse } from '../user/utils';

export const deleteAllUserQueuedArticles = async () => {
  console.log('deleting all user queued articles');
  try {
    const msDelayBetweenBatches = 2000;
    const req = {
      batchQuery: {},
      batchLimit: 100,
    };
    await iterateOverUsersAndExecWithDelay(
      req,
      async (_: IterationRequest<{}>, userBatch: PaginateResult<IUserDocument>): Promise<IterationResponse<{}>[]> => {
        await Promise.all(
          userBatch.docs.map(async (user: IUserDocument) => {
            user.articles = undefined;
            await user.save();
          }),
        );

        return userBatch.docs.map((user: IUserDocument) => ({
          userId: user._id,
        }));
      },
      msDelayBetweenBatches,
    );
  } catch (err) {
    console.error(err);
  }
};
