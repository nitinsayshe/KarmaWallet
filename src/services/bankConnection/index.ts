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
  const banks = await _getBankConnections({
    $and: [{ userId: requestor._id, status: BankStatus.Linked }],
  });
  console.log(banks, !!banks);
  if (!banks) throw new CustomError('Banks belongs to this user does not exist', ErrorTypes.NOT_FOUND);
  return banks;
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
  } else throw new CustomError('No access token found, banks might have already been removed.', ErrorTypes.NOT_FOUND);

  await BankConnectionModel.updateMany(
    { 'integrations.plaid.accessToken': bank.integrations.plaid.accessToken },
    {
      'integrations.plaid.accessToken': null,
      $push: { 'integrations.plaid.unlinkedAccessTokens': bank.integrations.plaid.accessToken },
    },
  );
};

export const removeBankConnection = async (req: IRequest<IRemoveBankParams, {}, {}>) => {
  const { requestor } = req;

  const _banks = await _getBankConnections({ userId: requestor._id });

  if (!_banks) throw new CustomError('Banks belongs to this user does not exist', ErrorTypes.NOT_FOUND);

  if (_banks[0]?.integrations?.plaid) {
    await _removePlaidBank(requestor, _banks[0]);
  }
  _banks.forEach(async (data) => {
    data.status = BankStatus.Unlinked;
    data.unlinkedDate = dayjs().utc().toDate();
    data.lastModified = dayjs().utc().toDate();
    await data.save();
  });

  return { message: 'Banks have been removed.' };
};
