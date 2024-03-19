import { DepositAccount } from '../../clients/marqeta/depositAccount';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { DepositAccountModel, IDepositAccountState } from '../../models/depositAccount';
import { IUserDocument } from '../../models/user';
import { _getDepositAccount, mapMarqetaDepositAccountToKarmaDB } from '../../services/depositAccount';
import { IRequest } from '../../types/request';
import { DepositAccountTypes, IMarqetaDepositAccount, IMarqetaDepositAccountTransition } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the DepositAccount class
const depositAccount = new DepositAccount(marqetaClient);

export const createDepositAccount = async (user: IUserDocument) => {
  const { _id: userId } = user;
  const { userToken } = user.integrations.marqeta;
  if (!userToken) {
    throw new Error('Marqeta User not Found');
  }
  // prepare payload for create Deposit Accounr
  const params: IMarqetaDepositAccount = {
    userToken,
    type: DepositAccountTypes.DEPOSIT_ACCOUNT,
  };
  const data = await depositAccount.createDepositAccount(params);
  // map the newly reacted deposit account to karma DB
  await mapMarqetaDepositAccountToKarmaDB(userId, data);
  return data;
};

export const getDepositAccount = async (userId: any) => {
  // get the deposit account from Karma DB
  const data = _getDepositAccount({ userId, state: IDepositAccountState.ACTIVE });
  return data;
};

export const depositAccountTransition = async (req: IRequest<{}, {}, IMarqetaDepositAccountTransition>) => {
  const parma = req.body;
  const { _id: userId } = req.requestor;
  // get the deposit account token from Karma DB
  const { token: accountToken } = await DepositAccountModel.findOne({ userId });
  const data = await depositAccount.depositAccountTransition({ accountToken, ...parma });
  return data;
};
