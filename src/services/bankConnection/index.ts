import { ObjectId } from 'mongodb';
import dayjs from 'dayjs';
import { BankConnectionModel, IBankConnection, IBankConnectionDocument, IBankRequestBody, IShareableBankConnection } from '../../models/bankConnection';
import { IRequest } from '../../types/request';
import { IUserDocument } from '../../models/user';
import { getShareableUser } from '../user';
import { IRef } from '../../types/model';
import { BankConnectionStatus, ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { PlaidClient } from '../../clients/plaid';
import { updateACHFundingSource } from '../../integrations/marqeta/accountFundingSource';

export const _getBankConnections = async (query: any) => BankConnectionModel.find(query);

export const getBankConnections = async (req: IRequest) => {
  const { requestor } = req;
  const banks = await _getBankConnections({ $and: [{ userId: requestor._id, status: BankConnectionStatus.Linked }] });

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
  fundingSourceToken,
  subtype,
  institution,
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
    institution,
    institutionId,
    fundingSourceToken,
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

const _removePlaidBank = async (requestor: IUserDocument, accessToken: string) => {
  const client = new PlaidClient();
  if (accessToken) {
    try {
      await client.removeItem({ access_token: accessToken });
    } catch (error) {
      throw new CustomError('Invalid access token, banks have already been removed.', ErrorTypes.FORBIDDEN);
    }
  }
  await BankConnectionModel.updateMany(
    { 'integrations.plaid.accessToken': accessToken },
    {
      'integrations.plaid.accessToken': null,
      $push: { 'integrations.plaid.unlinkedAccessTokens': accessToken },
    },
  );
};

export const removeBankConnection = async (req: IRequest<IRemoveBankParams, {}, IBankRequestBody>) => {
  const { requestor } = req;
  const { accessToken } = req.body;
  if (!accessToken) throw new CustomError('Access token is missing.', ErrorTypes.NOT_FOUND);
  const _banks = await _getBankConnections({ userId: requestor._id, 'integrations.plaid.accessToken': accessToken });

  if (!_banks) throw new CustomError('Banks belongs to this access token does not exist', ErrorTypes.NOT_FOUND);
  // remove/ deactive the funding source from marqeta
  await updateACHFundingSource(requestor._id, accessToken, { active: 'false' });
  // remove the access token from plaid
  await _removePlaidBank(requestor, accessToken);

  _banks.forEach(async (data) => {
    data.status = BankConnectionStatus.Removed;
    data.unlinkedDate = dayjs().utc().toDate();
    data.lastModified = dayjs().utc().toDate();
    await data.save();
  });

  return { message: 'Banks have been removed.' };
};

export interface IFormattedBankConnection {
  accessToken: string;
  institution: string;
  accounts: IShareableBankConnection[];
}

export const getFormattedBankConnection = (shareableBankConnections: IShareableBankConnection[]): IFormattedBankConnection[] => {
  const formattedResponse: IFormattedBankConnection[] = [];

  shareableBankConnections.forEach(connection => {
    const formattedConnection = formattedResponse.find(element => element?.accessToken === connection?.integrations?.plaid?.accessToken);
    if (!!formattedConnection) {
      const formattedConnectionIndex = formattedResponse.indexOf(formattedConnection);
      formattedResponse[formattedConnectionIndex] = {
        ...formattedConnection,
        accounts: [...formattedConnection.accounts, connection],
      };
    } else {
      const newformattedConnection = {
        accessToken: connection?.integrations?.plaid?.accessToken,
        institution: connection?.institution,
        accounts: [connection],
      };
      formattedResponse.push(newformattedConnection);
    }
  });

  return formattedResponse;
};
