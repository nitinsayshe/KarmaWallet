import * as ComparisonGame from '../services/comparisonGame';
import * as output from '../services/output';
import { IRequestHandler } from '../types/request';

interface IGetSwapsQuery {
  prev: string;
}

export const getSwaps: IRequestHandler<{}, IGetSwapsQuery, {}> = async (req, res, next) => {
  const previousSwaps = req.query?.prev ? req.query?.prev.split(',').map(val => parseInt(val, 10)) : [];

  const _previousSwaps = [];

  // assumes that index 1,2 were a pair, 3,4 were a pair, and so on.
  for (let i = 0; i < previousSwaps.length; i += 2) {
    if ((i + 1) <= previousSwaps.length) _previousSwaps.push([previousSwaps[i], previousSwaps[i + 1]]);
  }

  const data = await ComparisonGame.getSwaps(_previousSwaps);
  output.api(req, res, data);
  return next();
};
