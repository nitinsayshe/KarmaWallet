import { asCustomError } from '../../../lib/customError';
import * as output from '../../../services/output';
import * as PlaidIntegration from '../../../integrations/plaid';
import { IRequestHandler } from '../../../types/request';

export const mapExistingPlaidItems: IRequestHandler = async (req, res) => {
  try {
    const result = await PlaidIntegration.mapExistingItems(req);
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const mapTransactionsFromPlaid: IRequestHandler = async (req, res) => {
  try {
    const result = await PlaidIntegration.mapTransactionsFromPlaid(req);
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const mapPlaidCategoriesToKarmaCategoriesAndCarbonMultiplier: IRequestHandler = async (req, res) => {
  try {
    const result = await PlaidIntegration.mapPlaidCategoriesToKarmaCategoriesAndCarbonMultiplier(req);
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const reset: IRequestHandler = async (req, res) => {
  try {
    await PlaidIntegration.reset(req);
    output.api(req, res, { message: 'plaid mapping reset' });
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const sandboxFireTestWebhook: IRequestHandler = async (req, res) => {
  try {
    await PlaidIntegration.sandboxFireTestWebhook(req);
    output.api(req, res, { message: 'plaid mapping reset' });
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
