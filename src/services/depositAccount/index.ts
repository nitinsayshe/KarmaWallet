import * as MarqetaDepositAccount from '../../integrations/marqeta/depositAccount';
import { IMarqetaDepositAccount } from '../../integrations/marqeta/types';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { DepositAccountModel, IDepositAccount, IDepositAccountState } from '../../models/depositAccount';
import { IRequest } from '../../types/request';

// store marqeta Deposit account to karma DB
export const mapMarqetaDepositAccountToKarmaDB = async (_userId: string, DepositAccountData: IDepositAccount) => {
  try {
    const depositAccount = await DepositAccountModel.create({ userId: _userId, ...DepositAccountData });
    return depositAccount;
  } catch (error) {
    throw asCustomError(error);
  }
};

// create the Marqeta Deposit Account
export const createDepositAccount = async (req: IRequest<{}, {}, IMarqetaDepositAccount>) => {
  const { _id } = req.requestor;
  if (!_id) throw new CustomError('User id required.', ErrorTypes.GEN);
  const { data } = await MarqetaDepositAccount.createDepositAccount(req);
  // map marqeta deposit account to karma DB
  await mapMarqetaDepositAccountToKarmaDB(_id, data);
  return data;
};

// get the Marqeta Deposit Account list
export const getDepositAccount = async (req: IRequest<{}, {}, IMarqetaDepositAccount>) => {
  const { requestor } = req;
  const depositAccountData = await DepositAccountModel.findOne({
    $and: [{ state: { $in: [IDepositAccountState.ACTIVE] } }, { userId: requestor._id }],
  });

  // if user don't have any deposit account create new
  if (!depositAccountData) {
    const data = createDepositAccount(req);
    return data;
  }
  return depositAccountData;
};
