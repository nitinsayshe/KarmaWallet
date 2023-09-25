import { FilterQuery } from 'mongoose';
import { ObjectId } from 'mongodb';
import dayjs from 'dayjs';
import { BankConnectionModel, IBankConnection, IBankConnectionDocument, IShareableBankConnection } from '../../models/bankConnection';
import { IRequest } from '../../types/request';
import { IUserDocument } from '../../models/user';
import { getShareableUser } from '../user';
import { IRef } from '../../types/model';
import { BankStatus, ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { PlaidClient } from '../../clients/plaid';

export const _getBankConnections = async (query: FilterQuery<IBankConnection>) => BankConnectionModel.find(query);

export const getBankConnections = async (req: IRequest) => {
  const { requestor } = req;
  return _getBankConnections({
    $and: [{ userId: requestor._id, status: BankStatus.Linked }],
  });
};
export interface IRemoveBankParams {
  bank: IRef<ObjectId, IBankConnection>;
}
export const getShareableBankConnections = ({
  _id,
  userId,
  name,
  mask,
  type,
  subtype,
  institutionId,
  integrations,
  createdOn,
  lastModified,
  unlinkedDate,
  status,
  removedDate,
  initialTransactionsProcessing,
  lastTransactionSync,
}: IBankConnectionDocument): IShareableBankConnection & { _id: string } => {
  const _user = !!(userId as IUserDocument)?.name
    ? getShareableUser(userId as IUserDocument)
    : userId;

  return {
    _id,
    userId: _user,
    name,
    mask,
    type,
    subtype,
    institutionId,
    integrations,
    createdOn,
    unlinkedDate,
    status,
    removedDate,
    lastModified,
    initialTransactionsProcessing,
    lastTransactionSync,
  };
};

const _removePlaidBank = async (requestor: IUserDocument, bank: IBankConnectionDocument) => {
  const client = new PlaidClient();
  if (bank?.integrations?.plaid?.accessToken) {
    await client.removeItem({ access_token: bank.integrations.plaid.accessToken });
  }

  await BankConnectionModel.updateOne(
    { 'integrations.plaid.accessToken': bank.integrations.plaid.accessToken },
    {
      'integrations.plaid.accessToken': null,
      $push: { 'integrations.plaid.unlinkedAccessTokens': bank.integrations.plaid.accessToken },
    },
  );
};

export const removeBankConnection = async (req: IRequest<IRemoveBankParams, {}, {}>) => {
  const { bank } = req.params;
  const { requestor } = req;

  if (!bank) throw new CustomError('A bank id is required', ErrorTypes.INVALID_ARG);

  const _bank = await _getBankConnections({ _id: bank, user: requestor._id });

  if (!_bank) throw new CustomError('A bank with that id does not exist', ErrorTypes.NOT_FOUND);

  if (_bank[0]?.integrations?.plaid) {
    await _removePlaidBank(requestor, _bank[0]);
  }
  _bank[0].status = BankStatus.Unlinked;
  _bank[0].unlinkedDate = dayjs().utc().toDate();
  _bank[0].lastModified = dayjs().utc().toDate();
  await _bank[0].save();

  return { message: `Bank ${bank} has been removed.` };
};
