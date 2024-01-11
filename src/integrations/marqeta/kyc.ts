import { Kyc } from '../../clients/marqeta/kyc';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the Kyc class
const kyc = new Kyc(marqetaClient);

export const processUserKyc = async (userToken: string) => {
  const userResponse = await kyc.processKyc({ userToken });
  return userResponse;
};

export const listUserKyc = async (userToken: string) => {
  const userResponse = await kyc.listKyc(userToken);
  return userResponse;
};

export const getKycResult = async (req: IRequest<{ kycToken: string }, {}, {}>) => {
  const { kycToken } = req.params;
  const userResponse = await kyc.getKycResult(kycToken);
  return userResponse;
};
