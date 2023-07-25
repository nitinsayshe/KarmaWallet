import { Types } from 'mongoose';
import { getCustomFieldIDsAndUpdateSetFields, setLinkedCardData } from '../../integrations/activecampaign';
import * as KardIntegration from '../../integrations/kard';
import * as PlaidService from '../../integrations/plaid';
import { asCustomError } from '../../lib/customError';
import * as output from '../../services/output';
import { IRequestHandler } from '../../types/request';

export const createLinkToken: IRequestHandler<{app:boolean}, {}, PlaidService.ICreateLinkTokenBody> = async (req, res) => {
  try {
    const linkToken = await PlaidService.createLinkToken(req);
    output.api(req, res, linkToken);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

const syncKardData = async (userId: Types.ObjectId) => {
  try {
    await KardIntegration.updateKardData(userId);
  } catch (err) {
    console.error('Error syncing Kard data', err);
  }
};

export const exchangePublicToken: IRequestHandler<{}, {}, PlaidService.IExchangePublicTokenBody> = async (req, res) => {
  try {
    const response = await PlaidService.exchangePublicToken(req);
    if (req.requestor?._id) {
      // update linked cards in ActiveCampaign
      await getCustomFieldIDsAndUpdateSetFields(req.requestor._id.toString(), setLinkedCardData);
      await syncKardData(req.requestor._id);
    }
    output.api(req, res, response);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
