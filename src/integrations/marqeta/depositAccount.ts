import { DepositAccountClient } from '../../clients/marqeta/depositAccount';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { asCustomError } from '../../lib/customError';
import { DepositAccountModel } from '../../models/depositAccount';
import { IUserDocument } from '../../models/user';
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
    const depositAccount = await DepositAccountModel.findOneAndUpdate(
      { 'integrations.marqeta.token': depositAccountData.token },
      {
        $set: {
          lastModified: depositAccountData.created_time,
          state: depositAccountData.state,
          integrations: {
            marqeta: {
              state: depositAccountData.state,
              last_modified_time: depositAccountData.created_time,
            },
          },
        },
      },
      { new: true },
    );
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
  const { accountToken, state } = req.body;
  const data = await depositAccountClient.transitionDepositAccount({
    accountToken,
    state,
    channel: IMarqetaDepositAccountChannel.API,
  });
  return data;
};

export const handleMarqetaDirectDepositAccountTransitionWebhook = async (eventData: IMarqetaDirectDepositWebhookEvent) => {
  const { account_token: accountToken, state } = eventData;
  await updateMarqetaDepositAccountInKarmaDB({ token: accountToken, state, ...eventData });
};
