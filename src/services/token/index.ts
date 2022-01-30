import { nanoid } from 'nanoid';
import { TokenTypes } from '../../lib/constants';
import { getDateFrom } from '../../lib/date';
import { TokenModel } from '../../models/token';

export interface ICreateTokenData {
  user: string;
  minutes?: number;
  days?: number;
  type: TokenTypes;
}

export const getTokenById = async (id: string) => {
  const data = await TokenModel.findById(id).lean();
  return data;
};

export const getToken = async (user: string, value: string, type: TokenTypes) => {
  const data = await TokenModel.findOne({
    user, value, type, consumed: false, expires: { $gte: new Date() },
  }).select('-__v').lean();
  return data;
};

export const getTokenAndConsume = async (user: string, value: string, type: TokenTypes) => {
  const data = await TokenModel.findOneAndUpdate({
    user, value, type, consumed: false, expires: { $gte: new Date() },
  }, { consumed: true }, { new: true }).select('-__v').lean();
  return data;
};

export const createToken = async ({
  user,
  minutes,
  days,
  type,
}: ICreateTokenData) => {
  const expires = !!minutes || !!days ? getDateFrom({ minutes, days }) : getDateFrom({ minutes: 30 });
  const value = nanoid();
  const instance = new TokenModel({
    type, value, user, expires,
  });
  const data = await instance.save();
  return data;
};
