import { nanoid } from 'nanoid';
import dayjs from 'dayjs';
import { TokenTypes } from '../../lib/constants';
import { getDateFrom } from '../../lib/date';
import { TokenModel } from '../../models/token';
import { IUserDocument } from '../../models/user';

export interface ICreateTokenData {
  user: IUserDocument;
  minutes?: number;
  days?: number;
  type: TokenTypes;
  resource?: Object
}

export const getTokenById = async (id: string) => {
  const data = await TokenModel.findById(id).lean();
  return data;
};

export const getToken = async (user: IUserDocument, value: string, type: TokenTypes) => {
  const data = await TokenModel.findOne({
    user,
    value,
    type,
    consumed: false,
    expires: { $gte: dayjs().utc().toDate() },
  }).select('-__v').lean();
  return data;
};

export const getTokenAndConsume = async (user: IUserDocument, value: string, type: TokenTypes, additionalQuery?: object) => {
  let query = {
    user,
    value,
    type,
    consumed: false,
    expires: { $gte: dayjs().utc().toDate() },
  };
  if (!!additionalQuery) {
    query = { ...query, ...additionalQuery };
  }
  const token = await TokenModel.findOneAndUpdate(query, { consumed: true }, { new: true }).select('-__v').lean();
  return token;
};

export const createToken = async ({
  user,
  minutes,
  days,
  type,
  resource,
}: ICreateTokenData) => {
  const expires = !!minutes || !!days ? getDateFrom({ minutes, days }) : getDateFrom({ minutes: 30 });
  const value = nanoid();
  const instance = new TokenModel({
    type, value, user, expires, resource,
  });
  const data = await instance.save();
  return data;
};
