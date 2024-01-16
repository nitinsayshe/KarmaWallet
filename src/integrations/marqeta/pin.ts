import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { Pin } from '../../clients/marqeta/pin';
import { IRequest } from '../../types/request';
import { IMarqetaCreatePin, IMarqetaRevealPin } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the Pin class
const pinClient = new Pin(marqetaClient);

export const setPin = async (req: IRequest<{}, {}, IMarqetaCreatePin>) => {
  const { pin, ...params } = req.body;
  const data = await pinClient.createPinControlToken(params);
  const userResponse = await pinClient.setPin({ pin, ...data });
  return { data: userResponse };
};

export const getPin = async (req: IRequest<{}, {}, IMarqetaRevealPin>) => {
  const { cardholderVerificationMethod, ...params } = req.body;
  const data = await pinClient.createPinControlToken(params);
  const userResponse = await pinClient.getPin({ cardholderVerificationMethod, ...data });
  return { data: userResponse };
};
