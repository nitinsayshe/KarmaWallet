import { PaginateResult } from 'mongoose';
import { Card } from '../../clients/marqeta/card';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IMarqetaUserStatus, IMarqetaUserTransitionsEvent } from '../../integrations/marqeta/types';
import { sleep } from '../../lib/misc';
import { IUserDocument, UserModel } from '../../models/user';
import { IVisitorDocument } from '../../models/visitor';
import { mapMarqetaCardtoCard } from '../card';
import { setClosedEmailIfClosedStatusAndRemoveMarqetaIntegration } from '../user';
import { iterateOverUsersAndExecWithDelay, UserIterationRequest, UserIterationResponse } from '../user/utils';
import { iterateOverVisitorsAndExecWithDelay, VisitorIterationRequest, VisitorIterationResponse } from '../visitor/utils';

export const getCardsFromMarqeta = async (userId: string) => {
  const user = await UserModel.findById(userId);
  const { userToken } = user.integrations.marqeta;
  const marqetaClient = await new MarqetaClient();
  const cardClient = await new Card(marqetaClient);
  const usersCards = await cardClient.listCards(userToken);
  for (const card of usersCards.data) {
    await mapMarqetaCardtoCard(userId, card);
  }
};

const backoffMs = 1000;
export const updateClosedMarqetaAccounts = async () => {
  console.log('updating users with account status === closed');
  try {
    const msDelayBetweenBatches = 1000;
    const req = {
      batchQuery: { 'integrations.marqeta.status': IMarqetaUserStatus.CLOSED },
      batchLimit: 100,
    };
    await iterateOverUsersAndExecWithDelay(
      req,
      async (_: UserIterationRequest<{}>, userBatch: PaginateResult<IUserDocument>): Promise<UserIterationResponse<{}>[]> => {
        for (const user of userBatch.docs) {
          console.log(`updating user ${user._id}, ${user.emails.find((e) => e.primary)?.email}`);
          await setClosedEmailIfClosedStatusAndRemoveMarqetaIntegration(user, {
            ...user.integrations.marqeta,
            token: user.integrations.marqeta.userToken,
          } as unknown as IMarqetaUserTransitionsEvent);
          await sleep(backoffMs);
        }

        return userBatch.docs.map((user: IUserDocument) => ({
          userId: user._id,
        }));
      },
      msDelayBetweenBatches,
    );

    console.log('updating visitors with account status === closed');
    await iterateOverVisitorsAndExecWithDelay(
      req,
      async (_: VisitorIterationRequest<{}>, visitorBatch: PaginateResult<IVisitorDocument>): Promise<VisitorIterationResponse<{}>[]> => {
        for (const visitor of visitorBatch.docs) {
          console.log(`updating user ${visitor._id}, ${visitor.email}`);
          await setClosedEmailIfClosedStatusAndRemoveMarqetaIntegration(visitor, {
            ...visitor.integrations.marqeta,
            token: visitor.integrations.marqeta.userToken,
          } as unknown as IMarqetaUserTransitionsEvent);
          await sleep(backoffMs);
        }

        return visitorBatch.docs.map((visitor: IVisitorDocument) => ({
          visitorId: visitor._id,
        }));
      },
      msDelayBetweenBatches,
    );
  } catch (err) {
    console.error(err);
  }
};
