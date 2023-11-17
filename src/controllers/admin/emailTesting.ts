import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as EmailService from '../../services/email';
import { asCustomError } from '../../lib/customError';

export const testCashbackDepositedEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const promo = await EmailService.testCashbackDepositedEmail(req);
    output.api(req, res, promo);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
