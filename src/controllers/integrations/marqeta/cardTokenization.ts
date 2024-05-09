import { IVGSToken } from '../../../integrations/marqeta/types';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import { asCustomError } from '../../../lib/customError';
import * as CardTokenizationService from '../../../integrations/marqeta/cardTokenization';

// tokenize the card using VGS proxy
export const tokenizeCard: IRequestHandler<{ cardToken: string }, {}, {}> = async (req, res) => {
  try {
    const { cardToken } = req.params;
    const { data } = await CardTokenizationService.tokenizeCard(cardToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

// detokenize the card using VGS
export const deTokenizeCard: IRequestHandler<{}, {}, IVGSToken> = async (req, res) => {
  try {
    const { body } = req;
    const data = await CardTokenizationService.deTokenizeCard(body);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
