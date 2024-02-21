import { PaginateResult } from 'mongoose';
import { IUserDocument } from '../../models/user';
import { iterateOverUsersAndExecWithDelay, UserIterationRequest, UserIterationResponse } from '../user/utils';

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
      async (_: UserIterationRequest<{}>, userBatch: PaginateResult<IUserDocument>): Promise<UserIterationResponse<{}>[]> => {
        await Promise.all(
          userBatch.docs.map(async (user: IUserDocument) => {
            console.log(`deleting queued articles for user ${user._id}, ${user.emails.find((e) => e.primary)?.email}`);
            user.articles = undefined;
            try {
              await user.save();
            } catch (err) {
              console.error(`Error saving user: ${err}`);
            }
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
