/* eslint-disable camelcase */
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { IRequest } from '../../types/request';
import { PaypalClient } from '../../clients/paypal';
import { UserModel } from '../../models/user';
import { getShareableUser } from '../../services/user';
import { KarmaCommissionPayoutStatus, PayPalPayoutItemStatus } from '../../models/commissionPayout';
import { KarmaCommissionPayoutOverviewStatus } from '../../models/commissionPayoutOverview';
import { updateCommissionOverviewStatus, updateCommissionPayoutStatus } from '../../services/commission/utils';

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

export const processPaypalPayouts = async (body: any) => {
  const { resource, resource_type, event_type } = body;
  // Payouts Overviews
  if (resource_type === 'payouts') {
    const { sender_batch_id } = resource.batch_header.sender_batch_header;
    switch (event_type) {
      case 'PAYMENT.PAYOUTSBATCH.SUCCESS': {
        updateCommissionOverviewStatus(sender_batch_id, KarmaCommissionPayoutOverviewStatus.Success);
        break;
      }
      case 'PAYMENT.PAYOUTSBATCH.DENIED': {
        updateCommissionOverviewStatus(sender_batch_id, KarmaCommissionPayoutOverviewStatus.Denied);
        break;
      }
      case 'PAYMENT.PAYOUTSBATCH.PROCESSING': {
        updateCommissionOverviewStatus(sender_batch_id, KarmaCommissionPayoutOverviewStatus.Processing);
        break;
      }

      default:
        console.log('////// does not match any cases');
    }
  }

  // Indisvidual Payouts
  if (resource_type === 'payouts_item') {
    const payoutId = resource.payout_item.sender_item_id;
    if (!payoutId) throw new CustomError('Payout id is required');

    switch (event_type) {
      case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Paid, PayPalPayoutItemStatus.Success);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.FAILED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Failed);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.BLOCKED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Blocked);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.CANCELED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Canceled);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.DENIED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Denied);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.HELD': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Held);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.UNCLAIMED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Unclaimed);
        break;
      }
      case 'PAYMENT.PAYOUTS-ITEM.REFUNDED': {
        updateCommissionPayoutStatus(payoutId, KarmaCommissionPayoutStatus.Failed, PayPalPayoutItemStatus.Refunded);
        break;
      }

      default:
        console.log('////// does not match any cases');
    }
  }
};

export const processPaypalWebhook = async (body: any) => {
  const { resource_type } = body;
  if (resource_type === 'payouts' || resource_type === 'payouts_item') {
    await processPaypalPayouts(body);
  }
};
