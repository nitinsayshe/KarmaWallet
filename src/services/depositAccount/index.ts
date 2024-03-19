import { asCustomError } from '../../lib/customError';
import { DepositAccountModel } from '../../models/depositAccount';
import { IDepositAccountState } from '../../models/depositAccount/types';

export const getDepositAccounts = async (userId: string) => {
  try {
    const depositAccounts = await DepositAccountModel.find({ userId });
    return depositAccounts;
  } catch (error) {
    throw asCustomError(error);
  }
};

export const getActiveDepositAccount = async (userId: string) => {
  try {
    const depositAccount = await DepositAccountModel.findOne({ userId, state: IDepositAccountState.ACTIVE });
    return depositAccount;
  } catch (error) {
    throw asCustomError(error);
  }
};
