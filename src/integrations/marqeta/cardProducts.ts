import { CardProduct } from '../../clients/marqeta/cardProducts';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { IRequest } from '../../types/request';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the CardProducts class
const cardProduct = new CardProduct(marqetaClient);

export const createCardProduct = async (req: IRequest<{}, {}, {}>) => {
  const params = req.body;
  const userResponse = await cardProduct.createCardProduct(params);
  return { user: userResponse };
};

export const listCardProduct = async () => {
  const userResponse = await cardProduct.listCardProduct();
  return { user: userResponse };
};

export const getCardproduct = async (req: IRequest<{ cardProductToken: string }, { }, {}>) => {
  const { cardProductToken } = req.params;
  const userResponse = await cardProduct.getCardproduct(cardProductToken);
  return { data: userResponse };
};
