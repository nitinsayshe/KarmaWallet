import { DepositAccountClient } from '../../clients/marqeta/depositAccount';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { asCustomError } from '../../lib/customError';
import { getUtcDate } from '../../lib/date';
import { DepositAccountModel } from '../../models/depositAccount';
import { IUserDocument, UserModel } from '../../models/user';
import { IRequest } from '../../types/request';
import { DepositAccountTypes, IMarqetaDepositAccount, IMarqetaDepositAccountChannel, IMarqetaDepositAccountData, IMarqetaDepositAccountTransition, IMarqetaDirectDepositWebhookEvent } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the DepositAccount class
const depositAccountClient = new DepositAccountClient(marqetaClient);

// store marqeta Deposit account to karma DB
export const mapMarqetaDepositAccountToKarmaDB = async (_userId: string, depositAccountData: IMarqetaDepositAccountData) => {
  try {
    const depositAccount = await DepositAccountModel.create({
      userId: _userId,
      createdOn: depositAccountData.created_time,
      lastModified: depositAccountData.last_modified_time,
      routingNumber: depositAccountData.routing_number,
      accountNumber: depositAccountData.account_number,
      state: depositAccountData.state,
      integrations: {
        marqeta: {
          ...depositAccountData,
        },
      },
    });
    return depositAccount;
  } catch (error) {
    throw asCustomError(error);
  }
};

export const updateMarqetaDepositAccountInKarmaDB = async (depositAccountData: IMarqetaDirectDepositWebhookEvent) => {
  try {
    const depositAccount = await DepositAccountModel.findOne({ 'integrations.marqeta.token': depositAccountData.account_token });
    if (!depositAccount) {
      throw new Error(`[+] updateMarqetaDepositAccountInKarmaDB: Deposit account not found for token ${depositAccountData.account_token}. Account transitioned, but database not updated`);
    }
    const currentTime = getUtcDate().toDate();
    depositAccount.lastModified = currentTime;
    depositAccount.state = depositAccountData.state;
    depositAccount.integrations.marqeta.state = depositAccountData.state;
    depositAccount.integrations.marqeta.last_modified_time = currentTime;
    await depositAccount.save();
    return depositAccount;
  } catch (error) {
    throw asCustomError(error);
  }
};

export const createDepositAccount = async (user: IUserDocument) => {
  const { userToken } = user.integrations.marqeta;
  if (!userToken) {
    throw new Error(`[+] createDepositAccount: Marqeta usertoken not found on user ${user._id}'s integration`);
  }
  // prepare payload for create Deposit Accounr
  const params: IMarqetaDepositAccount = {
    userToken,
    type: DepositAccountTypes.DEPOSIT_ACCOUNT,
  };
  const data = await depositAccountClient.createDepositAccount(params);
  // map the newly created deposit account to karma DB
  await mapMarqetaDepositAccountToKarmaDB(user._id, data);
  return data;
};

export const listDepositAccountsForUser = async (marqetaUserToken: string) => {
  const data = await depositAccountClient.listDepositAccountsForUser(marqetaUserToken);
  return data;
};

export const getDepositAccountByToken = async (token: string) => {
  const data = await depositAccountClient.getDepositAccount(token);
  return data;
};

export const transitionDepositAccount = async (req: IRequest<{}, {}, IMarqetaDepositAccountTransition>) => {
  const { accountToken, state, reason } = req.body;
  const data = await depositAccountClient.transitionDepositAccount({
    accountToken,
    state,
    channel: IMarqetaDepositAccountChannel.API,
    reason,
  });

  await updateMarqetaDepositAccountInKarmaDB(data);
  return data;
};

export const getDepositAccountFromMarqetaAndAddToDB = async (userId: string, accountToken: string) => {
  const depositClient = new DepositAccountClient(marqetaClient);
  const depositAccountInfo = await depositClient.getDepositAccount(accountToken);

  const newDepositAccount = await mapMarqetaDepositAccountToKarmaDB(userId, {
    account_number: depositAccountInfo.account_number,
    routing_number: depositAccountInfo.routing_number,
    created_time: depositAccountInfo.created_time,
    last_modified_time: depositAccountInfo.last_modified_time,
    state: depositAccountInfo.state,
    token: accountToken,
    user_token: depositAccountInfo.user_token,
    type: depositAccountInfo.type,
  });

  return newDepositAccount;
};

export const handleMarqetaDirectDepositAccountTransitionWebhook = async (eventData: IMarqetaDirectDepositWebhookEvent) => {
  const { account_token: accountToken, state, user_token: userToken } = eventData;
  const existingAccount = await DepositAccountModel.findOne({ 'integrations.marqeta.token': accountToken });
  const user = await UserModel.findOne({ 'integrations.marqeta.userToken': userToken });
  if (existingAccount) {
    await updateMarqetaDepositAccountInKarmaDB({ token: accountToken, state, ...eventData });
  } else {
    const newAccount = await getDepositAccountFromMarqetaAndAddToDB(user._id.toString(), accountToken);
    if (!newAccount) {
      console.log(`[+] handleMarqetaDirectDepositAccountTransitionWebhook: Could not find or create deposit account for token ${accountToken}`);
    } else {
      console.log(`[+] handleMarqetaDirectDepositAccountTransitionWebhook: Created new deposit account for token ${accountToken}`);
    }
  }
};
