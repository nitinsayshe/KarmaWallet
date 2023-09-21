import { FilterQuery } from 'mongoose';
import { BankConnectionModel, IBankConnection, IBankConnectionDocument, IShareableBankConnection } from '../../models/bankConnection';
import { IRequest } from '../../types/request';
import { IUserDocument } from '../../models/user';
import { getShareableUser } from '../user';

export const _getBanks = async (query: FilterQuery<IBankConnection>) => BankConnectionModel.find(query);

export const getBanks = async (req: IRequest) => {
  const { requestor } = req;
  return _getBanks({
    $and: [{ userId: requestor._id }, { 'integrations.rare': null }],
  });
};

export const getShareableBank = ({
  _id,
  userId,
  name,
  mask,
  type,
  subtype,
  institution,
  integrations,
  createdOn,
  lastModified,
  unlinkedDate,
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
    integrations,
    createdOn,
    unlinkedDate,
    removedDate,
    lastModified,
    initialTransactionsProcessing,
    lastTransactionSync,
  };
};
