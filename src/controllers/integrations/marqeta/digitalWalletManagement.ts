import { IAppleWalletProvesion, IGoogleWalletProvesion, ISamsungWalletProvesion } from '../../../integrations/marqeta/types';
import * as DigitalWalletManagementService from '../../../integrations/marqeta/digitalWalletmanagement';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import { asCustomError } from '../../../lib/customError';
import { verifyRequiredFields } from '../../../lib/requestData';

export const appleWalletProvision: IRequestHandler<{}, {}, IAppleWalletProvesion> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['nonce', 'nonceSignature', 'certificates', 'provisioningAppVersion', 'deviceType', 'cardToken'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      throw new Error(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`);
    }
    const data = await DigitalWalletManagementService.appleWalletProvision(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const googleWalletProvision: IRequestHandler<{}, {}, IGoogleWalletProvesion> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['deviceType', 'provisioningAppVersion', 'walletAccountId', 'deviceId', 'cardToken'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      throw new Error(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`);
    }
    const { data } = await DigitalWalletManagementService.googleWalletProvision(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const samsungWalletProvision: IRequestHandler<{}, {}, ISamsungWalletProvesion> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['deviceType', 'provisioningAppVersion', 'walletUserId', 'deviceId', 'cardToken'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      throw new Error(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`);
    }
    const { data } = await DigitalWalletManagementService.samsungWalletProvision(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listDigitalWalletForUserCard: IRequestHandler<{ cardToken: string }, {}, {}> = async (req, res) => {
  try {
    const { cardToken } = req.params;
    const { data } = await DigitalWalletManagementService.listDigitalWalletForUserCard(cardToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
