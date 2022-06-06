import { nanoid } from 'nanoid';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery } from 'mongoose';
import { TokenTypes } from '../../lib/constants';
import { getDateFrom } from '../../lib/date';
import { IToken, TokenModel } from '../../models/token';
import { IUserDocument } from '../../models/user';

dayjs.extend(utc);

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

export const getToken = async (query: FilterQuery<IToken>) => TokenModel.findOne({
  ...query,
  expires: { $gte: dayjs().utc().toDate() },
});

export const getTokenAndConsume = async (query: FilterQuery<IToken>) => TokenModel.findOneAndUpdate({ ...query, consumed: false }, { consumed: true }, { new: true });

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
