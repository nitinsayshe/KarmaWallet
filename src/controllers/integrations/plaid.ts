import { IRequestHandler } from '../../types/request';
import * as PlaidService from '../../integrations/plaid';
import * as output from '../../services/output';
import { asCustomError } from '../../lib/customError';
import { getCustomFieldIDsAndUpdateLinkedCards } from '../../integrations/activecampaign';

export const createLinkToken: IRequestHandler<{}, {}, PlaidService.ICreateLinkTokenBody> = async (req, res) => {
  try {
    const linkToken = await PlaidService.createLinkToken(req);
    output.api(req, res, linkToken);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const exchangePublicToken: IRequestHandler<{}, {}, PlaidService.IExchangePublicTokenBody> = async (req, res) => {
  try {
    const response = await PlaidService.exchangePublicToken(req);
    if (req.requestor?._id) {
      // update linked cards in ActiveCampaign
      await getCustomFieldIDsAndUpdateLinkedCards(req.requestor._id.toString());
    }
    output.api(req, res, response);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
