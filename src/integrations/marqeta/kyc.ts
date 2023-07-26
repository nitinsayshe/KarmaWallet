import { Kyc } from '../../clients/marqeta/kyc';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';
import { IMarqetaProcessKyc } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the Kyc class
const kyc = new Kyc(marqetaClient);

export const processUserKyc = async (req: IRequest<{}, {}, IMarqetaProcessKyc>) => {
  const params = req.body;
  const { _id: userId } = req.requestor;
  const userResponse = await kyc.processKyc({ user_token: userId, ...params });
  return { user: userResponse };
};

export const listUserKyc = async (userToken:string) => {
  const userResponse = await kyc.listKyc(userToken);
  return { user: userResponse };
};
