import { IRequestHandler } from '../../types/request';
import * as PaypalService from '../../integrations/paypal';
import * as output from '../../services/output';
import { asCustomError } from '../../lib/customError';

export const linkAccount: IRequestHandler<{}, {}, PaypalService.ILinkAccountBody> = async (req, res) => {
  try {
    const data = await PaypalService.linkAccount(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const unlinkAccount: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const data = await PaypalService.unlinkAccount(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
