import { getCustomFieldIDsAndUpdateSetFields, setLinkedCardData } from '../../integrations/activecampaign';
import * as PlaidService from '../../integrations/plaid';
import { asCustomError } from '../../lib/customError';
import * as output from '../../services/output';
import { IRequestHandler } from '../../types/request';

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
      await getCustomFieldIDsAndUpdateSetFields(req.requestor._id.toString(), setLinkedCardData);
    }
    output.api(req, res, response);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
