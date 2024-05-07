import { PaginateResult } from 'mongoose';
import { nanoid } from 'nanoid';
import { sleep } from '../../lib/misc';
import { IUserDocument } from '../../models/user';
import { IVisitorDocument, VisitorModel } from '../../models/visitor';
import { iterateOverUsersAndExecWithDelay, UserIterationRequest, UserIterationResponse } from '../user/utils';
import { iterateOverVisitorsAndExecWithDelay, VisitorIterationRequest, VisitorIterationResponse } from '../visitor/utils';

const delayBetweenDBRequests = 300;
// backfill user email tokens
const msDelayBetweenBatches = 1000;

export const backfillEmailTokens = async () => {
  const req = {
    batchQuery: {},
    batchLimit: 100,
  };
  await iterateOverUsersAndExecWithDelay(
    req,
    async (_: UserIterationRequest<{}>, userBatch: PaginateResult<IUserDocument>): Promise<UserIterationResponse<{}>[]> => {
      for (const user of userBatch.docs) {
        console.log(`updating user ${user._id}, ${user.emails.find((e) => e.primary)?.email}`);

        user.emails = await Promise.all(
          user?.emails?.map(async (email) => {
            if (!email.token) {
              email.token = nanoid();
              console.log(`updating user ${user._id} with email: ${email} to have nanoid: ${email.token}`);
            }

            const visitor = await VisitorModel.findOne({ email: email.email });
            if (visitor) {
              visitor.emailToken = email.token;
              await visitor.save();
            }
            return email;
          }),
        );
        await user.save();
        await sleep(delayBetweenDBRequests);
      }

      return userBatch.docs.map((user: IUserDocument) => ({
        userId: user._id,
      }));
    },
    msDelayBetweenBatches,
  );

  await iterateOverVisitorsAndExecWithDelay(
    req,
    async (_: VisitorIterationRequest<{}>, visitorBatch: PaginateResult<IVisitorDocument>): Promise<VisitorIterationResponse<{}>[]> => {
      for (const visitor of visitorBatch.docs) {
        if (!visitor.emailToken) {
          visitor.emailToken = nanoid();
          console.log(`updating visitor ${visitor._id}, ${visitor.email} to have nanoid: ${visitor.emailToken}`);
        }
        await visitor.save();
        await sleep(delayBetweenDBRequests);
      }

      return visitorBatch.docs.map((visitor: IVisitorDocument) => ({
        visitorId: visitor._id,
      }));
    },
    msDelayBetweenBatches,
  );
};
