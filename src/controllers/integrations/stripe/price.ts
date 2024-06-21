import * as output from '../../../services/output';
import { asCustomError } from '../../../lib/customError';
import { IRequestHandler } from '../../../types/request';
import * as StripePriceService from '../../../integrations/stripe/price';
import { IListPricesParams } from '../../../integrations/stripe/types';

export const listPrices: IRequestHandler<{}, {}, IListPricesParams> = async (req, res) => {
  try {
    const data = await StripePriceService.listPrices(req.query);
    console.log(data);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
