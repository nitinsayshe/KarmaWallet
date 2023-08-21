import { Kyc } from '../../clients/marqeta/kyc';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';
import { IMarqetaProcessKyc } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the Kyc class
const kyc = new Kyc(marqetaClient);

export const processUserKyc = async (req: IRequest<{ userToken: string }, {}, IMarqetaProcessKyc>) => {
  const { userToken } = req.params;
  const params = { userToken, ...req.body };
  const userResponse = await kyc.processKyc(params);
  return { user: userResponse };
};

export const listUserKyc = async (userToken: string) => {
  const userResponse = await kyc.listKyc(userToken);
  return { user: userResponse };
};

export const getKycResult = async (req: IRequest<{ kycToken: string }, {}, {}>) => {
  const { kycToken } = req.params;
  const userResponse = await kyc.getKycResult(kycToken);
  return { user: userResponse };
};
