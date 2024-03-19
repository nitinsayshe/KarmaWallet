import { FilterQuery } from 'mongoose';
import { asCustomError } from '../../lib/customError';
import { DepositAccountModel, IDepositAccount } from '../../models/depositAccount';

export const _getDepositAccount = async (query: FilterQuery<IDepositAccount>) => DepositAccountModel.findOne(query);

// store marqeta Deposit account to karma DB
export const mapMarqetaDepositAccountToKarmaDB = async (_userId: string, DepositAccountData: IDepositAccount) => {
  try {
    const depositAccount = await DepositAccountModel.create({ userId: _userId, ...DepositAccountData });
    return depositAccount;
  } catch (error) {
    throw asCustomError(error);
  }
};
