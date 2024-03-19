import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { PaginateResult } from 'mongoose';
import { Card } from '../../clients/marqeta/card';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IMarqetaUserStatus, IMarqetaUserTransitionsEvent, ListUsersResponse, MarqetaUserModel } from '../../integrations/marqeta/types';
import { User } from '../../clients/marqeta/user';
import { sleep } from '../../lib/misc';
import { IUserDocument, UserModel } from '../../models/user';
import { IVisitorDocument } from '../../models/visitor';
import { mapMarqetaCardtoCard } from '../card';
import { setClosedEmailIfClosedStatusAndRemoveMarqetaIntegration } from '../user';
import { iterateOverUsersAndExecWithDelay, UserIterationRequest, UserIterationResponse } from '../user/utils';
import { iterateOverVisitorsAndExecWithDelay, VisitorIterationRequest, VisitorIterationResponse } from '../visitor/utils';

const backoffMs = 1000;

export const getCardsFromMarqeta = async (userId: string) => {
  const user = await UserModel.findById(userId);
  const { userToken } = user.integrations.marqeta;
  const marqetaClient = new MarqetaClient();
  const cardClient = new Card(marqetaClient);
  const usersCards = await cardClient.listCards(userToken);
  for (const card of usersCards.data) {
    await mapMarqetaCardtoCard(userId, card);
  }
};

export const updateEmailOfClosedAccountsFromMarqeta = async () => {
  // make paginated requests to marqeta to get all closed accounts
  const marqetaClient = new MarqetaClient();
  const client = new User(marqetaClient);
  let isMore = true;
  let startIndex = 0;
  while (isMore) {
    try {
      // get the next page of closed accounts
      const userBatch: { end_index: number; start_index: number; is_more: boolean; data: MarqetaUserModel[] } = await client.listMarqetaUsers({ isMore: isMore ? 'true' : 'false', startIndex: `${startIndex}`, count: '10' });

      for (const user of userBatch.data) {
        // for each account, update the email of the user if it is closed and doesn't already contain +closed
        if (user.status !== IMarqetaUserStatus.CLOSED) {
          continue;
        }
        console.log('user with closed account: ', user.email);

        const { email } = user;
        if (!email) {
          console.log('no email for user: ', JSON.stringify(user, null, 2));
          continue;
        }
        if (email.includes('+closed')) {
          continue;
        }
        console.log('updating user: ', user.email);
      }
      startIndex = userBatch.end_index + 1;
      isMore = userBatch.is_more;
      await sleep(backoffMs);
    } catch (err) {
      isMore = false;

      console.error(err);
    }
  }
  // for each account, update the email of the user
};

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
            status: user.integrations.marqeta.status,
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
            status: visitor.integrations.marqeta.status,
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

export const getUsersMissingPhoneNumber = async () => {
  const marqetaClient = new MarqetaClient();
  const userClient = new User(marqetaClient);

  let usersMissingPhoneNumber: MarqetaUserModel[] = [];

  let startIndex = 0;
  let isMore = true;
  while (isMore) {
    try {
      console.log('on startIndex: ', startIndex);
      const userBatch: ListUsersResponse = await userClient.listMarqetaUsers({
        isMore: isMore.toString(),
        startIndex: startIndex.toString(),
        count: '10',
      });

      isMore = userBatch.is_more;
      startIndex = userBatch.end_index + 1;

      // find any users that don't have a phone number
      usersMissingPhoneNumber = [...usersMissingPhoneNumber, ...userBatch.data.filter((user) => !user.phone)];

      console.log(`fetched ${userBatch.data.length} users`);
    } catch (err) {
      isMore = false;
      console.error(err);
    }
  }

  // filter out any that aren't in an active state
  usersMissingPhoneNumber = usersMissingPhoneNumber.filter((user) => user.active);

  console.log('found users missing phone number: ', usersMissingPhoneNumber.length);

  const _userCSV = parse(
    usersMissingPhoneNumber.map((user) => ({
      name: `${user.first_name}${!!user.middle_name ? ` ${user.middle_name}` : ''}  ${user.last_name}`,
      email: user.email,
      token: user.token,
    })),
  );
  fs.writeFileSync(path.join(__dirname, '.tmp', 'marqeta_users_without_phone_number.csv'), _userCSV);
};
