/* eslint-disable camelcase */
import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { PaginateResult } from 'mongoose';
import { Card } from '../../clients/marqeta/card';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IMarqetaKycState, IMarqetaUserStatus, IMarqetaUserTransitionsEvent, MarqetaUserModel } from '../../integrations/marqeta/user/types';
import { User } from '../../clients/marqeta/user';
import { sleep } from '../../lib/misc';
import { IUserDocument, UserModel } from '../../models/user';
import {  IVisitorDocument, VisitorModel } from '../../models/visitor';
import { mapMarqetaCardtoCard } from '../card';
import { iterateOverUsersAndExecWithDelay, UserIterationRequest, UserIterationResponse } from '../user/utils';
import { createDepositAccount, listDepositAccountsForUser, mapMarqetaDepositAccountToKarmaDB } from '../../integrations/marqeta/depositAccount';
import { DepositAccountModel } from '../../models/depositAccount';
import { CardModel } from '../../models/card';
import { listUserKyc, processUserKyc } from '../../integrations/marqeta/kyc';
import { isUserKYCVerified } from '../karmaCard';
import { ReasonCode } from '../karmaCard/utils';
import { iterateOverVisitorsAndExecWithDelay, VisitorIterationRequest, VisitorIterationResponse } from '../visitor/utils';
import { ListUsersResponse } from '../../integrations/marqeta/user';
import { IMarqetaVisitorData } from '../../models/visitor/types';
import { setClosedMarqetaAccountState } from '../../integrations/marqeta/user/utils';

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
          await setClosedMarqetaAccountState(user, {
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
          console.log(`updating visitor ${visitor._id}, ${visitor.email}`);
          await setClosedMarqetaAccountState(visitor, {
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

export const performKYCOnUser = async (userToken: string) => {
  // get the kyc list of a user
  const existingKYCChecks = await listUserKyc(userToken);
  let kycResponse;

  // perform the kyc through marqeta & create the card
  if (!isUserKYCVerified(existingKYCChecks)) {
    kycResponse = await processUserKyc(userToken);
  } else {
    kycResponse = existingKYCChecks.data.find((kyc: any) => kyc.result.status === IMarqetaKycState.success);
  }

  return kycResponse;
};

export const addMarqetaIntegrationToVisitor = async (marqetaId: string) => {
  const marqetaClient = new MarqetaClient();
  const userClient = new User(marqetaClient);
  const marqetaUser = await userClient.getMarqetaUser(marqetaId);

  if (!marqetaUser) {
    console.error(`no user found with id: ${marqetaId}`);
    return;
  }

  const visitor = await VisitorModel.findOne({ email: marqetaUser.email });
  if (!visitor.integrations) {
    visitor.integrations = {};
  }

  const { first_name, last_name, token, email, address1, city, state, postal_code, country, birth_date, phone, created_time, address2 } = marqetaUser;

  // MARQETA KYC/CREATE USER
  const kycResponse = await performKYCOnUser(token);

  // get the kyc result code
  let { status } = kycResponse.result;
  const { codes } = kycResponse.result;
  let kycErrorCodes = codes?.map((item: any) => item.code);
  const passedPersonaInquiry = visitor.integrations.persona?.inquiries?.filter((inquiry) => inquiry.status === 'completed').length > 0;

  if (!passedPersonaInquiry) {
    status = IMarqetaKycState.failure;
    kycErrorCodes = !!kycErrorCodes ? [...kycErrorCodes, ReasonCode.FailedInternalKyc] : [ReasonCode.FailedInternalKyc];
  }

  // MARQETA KYC: Prepare Data to create a User in Marqeta and submit for Marqeta KYC
  const marqetaKYCInfo: IMarqetaVisitorData = {
    userToken: token,
    kycResult: { status, codes: kycErrorCodes },
    first_name,
    last_name,
    address1,
    birth_date,
    phone,
    postal_code,
    status: marqetaUser.status,
    country,
    state,
    city,
    email,
    created_time: created_time.toString(),
    identifications: [
      {
        type: 'SSN',
        value: '',
      },
    ],
  };

  if (address2) marqetaKYCInfo.address2 = address2;

  visitor.integrations.marqeta = marqetaKYCInfo;
  const updatedVisitor = await visitor.save();

  console.log('///// data to add to visitor', updatedVisitor);
};
