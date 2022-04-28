import { FilterQuery } from 'mongoose';
import { CardModel, ICard } from '../../models/card';

import { IRequest } from '../../types/request';

export const getCards = async (req: IRequest, query: FilterQuery<ICard>) => {
  const cards = await CardModel.find(query);
  return cards;
};
