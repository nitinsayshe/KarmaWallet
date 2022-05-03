import { ObjectId, FilterQuery } from 'mongoose';
import { ICardDocument, CardModel, ICard } from '../../models/card';
import { IRequest } from '../../types/request';
import { IShareableUser, IUserDocument } from '../../models/user';
import { IRef } from '../../types/model';
import { getShareableUser } from '../user';

/*
  userId: IRef<ObjectId, IShareableUser>;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  status: CardStatus;
  institution: string;
  createdOn: Date;
  lastModified: Date;
*/

export const getShareableCard = ({
  userId,
  name,
  mask,
  type,
  subtype,
  status,
  institution,
  createdOn,
  lastModified,
}: ICardDocument) => {
  const _user: IRef<ObjectId, IShareableUser> = !!(userId as IUserDocument)?.name
    ? getShareableUser(userId as IUserDocument)
    : userId;

  return {
    userId: _user,
    name,
    mask,
    type,
    subtype,
    status,
    institution,
    createdOn,
    lastModified,
  };
};

export const _getCards = async (req: IRequest, query: FilterQuery<ICard>) => CardModel.find(query);
