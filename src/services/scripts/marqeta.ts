import { PaginateResult } from 'mongoose';
import { Card } from '../../clients/marqeta/card';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IMarqetaUserStatus, IMarqetaUserTransitionsEvent, MarqetaUserModel } from '../../integrations/marqeta/types';
import { User } from '../../clients/marqeta/user';
import { sleep } from '../../lib/misc';
import { IUserDocument, UserModel } from '../../models/user';
import { IVisitorDocument } from '../../models/visitor';
import { mapMarqetaCardtoCard } from '../card';
import { setClosedEmailIfClosedStatusAndRemoveMarqetaIntegration } from '../user';
import { iterateOverUsersAndExecWithDelay, UserIterationRequest, UserIterationResponse } from '../user/utils';
import { iterateOverVisitorsAndExecWithDelay, VisitorIterationRequest, VisitorIterationResponse } from '../visitor/utils';
import { createDepositAccount, listDepositAccountsForUser, mapMarqetaDepositAccountToKarmaDB } from '../../integrations/marqeta/depositAccount';
import { DepositAccountModel } from '../../models/depositAccount';
import { CardModel } from '../../models/card';

const backoffMs = 1000;

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

export const addDepositAccountToMarqetaUsers = async () => {
  try {
    // Fetch all existing users from the database
    const users = await UserModel.find({ 'integrations.marqeta.status': IMarqetaUserStatus.ACTIVE });
    // Iterate through each user and generate an deposit account number for them
    for (const user of users) {
      // check for the user if he is already having any ACTIVE deposit acccount
      const depositAccount = await listDepositAccountsForUser(user.integrations.marqeta.userToken);
      const activeAccount = depositAccount.data.find((account: any) => account.state === 'ACTIVE');
      const hasActiveMarqetaCard = await CardModel.findOne({ userId: user._id, 'integrations.marqeta.state': 'ACTIVE' });

      if (!depositAccount.data.length || !activeAccount) {
        // Generate deposit account number & map into database
        if (hasActiveMarqetaCard) {
          const depoistNumber = await createDepositAccount(user);
          console.log(`Assigned deposit account number ${depoistNumber?.accountNumber} to user ${user._id}`);
        }
      }
      console.log(`this user ${user._id} already have deposit account number`);
    }
    console.log('deposit account numbers assigned to all users successfully.');
  } catch (err) {
    console.error('Error assigning deposit account numbers to users:', err);
  }
};

export const addDepositAccountsToKWDatabase = async () => {
  const marqetaUsers = await UserModel.find({ 'integrations.marqeta.status': IMarqetaUserStatus.ACTIVE });

  for (const marqetaUser of marqetaUsers) {
    const _id = marqetaUser._id.toString();
    const existingDepositAccount = await DepositAccountModel.findOne({ userId: _id });

    if (!existingDepositAccount) {
      const data = await listDepositAccountsForUser(marqetaUser.integrations.marqeta.userToken);
      if (data.data.length > 0) {
        for (const depositAccount of data.data) {
          await mapMarqetaDepositAccountToKarmaDB(_id, depositAccount);
        }
      }
    }
  }
};
