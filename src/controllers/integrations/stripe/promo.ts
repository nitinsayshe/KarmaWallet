import * as StripePromoService from '../../../integrations/stripe/promo';
import { asCustomError } from '../../../lib/customError';
import * as output from '../../../services/output';
import { IRequestHandler } from '../../../types/request';

export const listPromos: IRequestHandler<{}, { numberToList?: number }> = async (req, res) => {
  try {
    const { query } = req;
    const data = await StripePromoService.listPromos(query?.numberToList || 1000);
    console.log(data);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
