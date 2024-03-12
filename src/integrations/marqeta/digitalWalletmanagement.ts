import { DigitalWalletManagement } from '../../clients/marqeta/digitalWalletManagement';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';
import { IAppleWalletProvesion, IGoogleWalletProvesion, ISamsungWalletProvesion } from './types';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the digitalWalletManagement class
const digitalWalletManagement = new DigitalWalletManagement(marqetaClient);

export const appleWalletProvision = async (req: IRequest<{}, {}, IAppleWalletProvesion>) => {
  const params = { ...req.body };
  const data = await digitalWalletManagement.appleWalletProvision(params);
  return { data };
};

export const googleWalletProvision = async (req: IRequest<{}, {}, IGoogleWalletProvesion>) => {
  const params = { ...req.body };
  const data = await digitalWalletManagement.googleWalletProvision(params);
  return { data };
};

export const samsungWalletProvision = async (req: IRequest<{}, {}, ISamsungWalletProvesion>) => {
  const params = { ...req.body };
  const data = await digitalWalletManagement.samsungWalletProvision(params);
  return { data };
};

export const listDigitalWalletForUserCard = async (cardToken: string) => {
  const data = await digitalWalletManagement.listDigitalWalletForUserCard(cardToken);
  return data;
};
