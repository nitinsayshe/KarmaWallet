import { IMarqetaDepositAccountTransitionState } from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { DepositAccountModel } from '../../models/depositAccount';

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
    const depositAccount = await DepositAccountModel.findOne({ userId, state: IMarqetaDepositAccountTransitionState.ACTIVE });
    return depositAccount;
  } catch (error) {
    throw asCustomError(error);
  }
};

export const userHasActiveOrSuspendedDepositAccount = async (userId: string) => {
  try {
    const depositAccount = await DepositAccountModel.findOne({
      userId,
      state: { $in: [IMarqetaDepositAccountTransitionState.ACTIVE, IMarqetaDepositAccountTransitionState.SUSPENDED] },
    });
    return !!depositAccount;
  } catch (error) {
    throw asCustomError(error);
  }
};
