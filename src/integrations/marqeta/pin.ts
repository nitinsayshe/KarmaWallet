import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { Pin } from '../../clients/marqeta/pin';
import { IRequest } from '../../types/request';
import { IMarqetaCreatePin } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the Pin class
const pinClient = new Pin(marqetaClient);

export const setPin = async (req: IRequest<{}, {}, IMarqetaCreatePin>) => {
  const { cardToken, pinNumber, controlTokenType } = req.body;
  const userResponse = await pinClient.createPinControlToken({ cardToken, controlTokenType });
  return { data: userResponse };
};

export const listUsers = async () => {
  const userResponse = await user.listUsers();
  return { data: userResponse };
};
