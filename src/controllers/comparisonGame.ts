import * as ComparisonGame from '../services/comparisonGame';
import * as CompanyService from '../services/company';
import * as output from '../services/output';
import { IRequestHandler } from '../types/request';
import { ICompanyDocument } from '../models/company';
import { asCustomError } from '../lib/customError';

interface IGetSwapsQuery {
  prev: string;
}

export const getSwaps: IRequestHandler<{}, IGetSwapsQuery, {}> = async (req, res) => {
  try {
    const previousSwaps = req.query?.prev ? req.query?.prev.split(',') : [];

    const _previousSwaps = [];

    // assumes that index 1,2 were a pair, 3,4 were a pair, and so on.
    for (let i = 0; i < previousSwaps.length; i += 2) {
      if ((i + 1) <= previousSwaps.length) _previousSwaps.push([previousSwaps[i], previousSwaps[i + 1]]);
    }

    const swaps = await ComparisonGame.getSwaps(_previousSwaps);
    const result = {
      ...swaps,
      swaps: swaps.swaps.map(s => CompanyService.getShareableCompany(s as ICompanyDocument)),
    };
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
