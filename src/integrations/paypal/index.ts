import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { IRequest } from '../../types/request';
import { PaypalClient } from '../../clients/paypal';
import { UserModel } from '../../models/user';
import { getShareableUser } from '../../services/user';

export interface ILinkAccountBody {
  code: string;
}

export const linkAccount = async (req: IRequest<{}, {}, ILinkAccountBody>) => {
  const { requestor } = req;
  const { code } = req.body;
  if (!code) throw new CustomError('Missing code', ErrorTypes.INVALID_ARG);
  const paypalClient = new PaypalClient();
  const { access_token: accessToken } = await paypalClient.getAccessToken(code);
  let responseMessage = '';
  const customerData = await paypalClient.getCustomerDataFromToken(accessToken);
  // TODO: confirm data structure from paypal response
  const user = await UserModel.findOneAndUpdate({ _id: requestor._id }, { 'integrations.paypal': customerData }, { new: true });
  if (customerData) responseMessage = 'Successfully linked Paypal account';
  else responseMessage = 'Failed to link Paypal account';
  return { message: responseMessage, user: getShareableUser(user) };
};

export const unlinkAccount = async (req: IRequest<{}, {}, {}>) => {
  const { requestor } = req;
  const user = await UserModel.findOneAndUpdate({ _id: requestor._id }, { 'integrations.paypal': null }, { new: true });
  return { message: 'Paypal account successfully unlinked', user: getShareableUser(user) };
};
