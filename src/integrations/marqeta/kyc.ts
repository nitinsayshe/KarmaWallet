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
  const responseMessage = '';
  const userResponse = await kyc.processKyc(params);
  return { message: responseMessage, user: userResponse };
};

export const listUserKyc = async (userToken:string) => {
  const responseMessage = '';
  const userResponse = await kyc.listKyc(userToken);
  return { message: responseMessage, user: userResponse };
};
