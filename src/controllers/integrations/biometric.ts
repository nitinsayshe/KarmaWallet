import { IRequestHandler } from '../../types/request';
import * as BiometricService from '../../integrations/biometric';
import * as output from '../../services/output';
import { asCustomError } from '../../lib/customError';
import * as UserService from '../../services/user';

export const registerBiometric: IRequestHandler<{}, {}, BiometricService.IUserBiometric> = async (req, res) => {
  try {
    const { user, identifierKey } = await BiometricService.registerBiometricData(req);
    output.api(req, res, UserService.getShareableUser(user), '', 200, identifierKey);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const removeBiometric: IRequestHandler<BiometricService.IRemoveBiometricKey, {}, BiometricService.IUserBiometric> = async (req, res) => {
  try {
    const { user } = await BiometricService.removeBiometricData(req);
    output.api(req, res, UserService.getShareableUser(user));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
