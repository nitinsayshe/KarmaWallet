import { IRequest } from '../../types/request';
import CustomError from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';
import { UserModel } from '../../models/user';

export interface IUserBiometric {
  biometricKey: string;
  isBiometricEnabled?: boolean;
}
export interface IRemoveBiometricKey {
  identifierKey: string;
}

export const registerBiometricData = async (req: IRequest<{}, {}, IUserBiometric>) => {
  const { requestor } = req;
  const { biometricKey, isBiometricEnabled } = req.body;

  // check that all required fields are present
  if (!biometricKey) throw new CustomError('biometricKey Key is required', ErrorTypes.INVALID_ARG);

  // save the biometric data
  requestor.integrations.biometrics.push({ biometricKey, isBiometricEnabled });
  const savedUser = await requestor.save();

  // Retrieve the ID of the newly pushed biometric data object
  const newBiometricId = savedUser.integrations.biometrics[savedUser.integrations.biometrics.length - 1]._id;
  return { message: 'Registerd biometric succesfully', user: requestor, identifierKey: newBiometricId };
};

export const removeBiometricData = async (req: IRequest<IRemoveBiometricKey, {}, IUserBiometric>) => {
  const { requestor } = req;
  const { identifierKey } = req.params;

  // Remove the biometric data for specific identifer
  const user = await UserModel.findByIdAndUpdate(
    { _id: requestor._id },
    { $pull: { 'integrations.biometrics': { _id: identifierKey } } },
    { new: true },
  );
  return { message: 'Removed biometric data succesfully', user };
};
