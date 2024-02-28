/* eslint-disable camelcase */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ACHSource } from '../../clients/marqeta/accountFundingSource';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { createACHBankTransfer, validateCreateACHBankTransferRequest } from '../../integrations/marqeta/accountFundingSource';
import { ACHTransferTransitionStatusEnum, IACHBankTransfer, IMarqetaACHBankTransfer, IMarqetaACHBankTransferTransition, IMarqetaBankTransferTransitionEvent, MarqetaBankTransitionStatus } from '../../integrations/marqeta/types';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { verifyRequiredFields } from '../../lib/requestData';
import { ACHFundingSourceModel } from '../../models/achFundingSource';
import { IACHTransfer, IBank } from '../../models/achTransfer/types';
import { ACHTransferModel } from '../../models/achTransfer';
import { IRequest } from '../../types/request';
import { createACHInitiationUserNotification, createACHTransferCancelledUserNotification, createACHTransferReturnedUserNotification, createPushUserNotificationFromUserAndPushData } from '../user_notification';
import { BankConnectionModel } from '../../models/bankConnection';
import { UserModel } from '../../models/user';
import { PushNotificationTypes } from '../../lib/constants/notification';

dayjs.extend(utc);

export interface IACHTransferParams {
  achTransferId: string;
}

// store ACH bank transfer  to karma DB
export const mapACHBankTransfer = async (userId: string, ACHBankTransferData: IACHBankTransfer, bank: IBank) => {
  const { token } = ACHBankTransferData;
  let ACHBankTranfer = await ACHTransferModel.findOne({ userId, token });
  if (!ACHBankTranfer) {
    ACHBankTranfer = await ACHTransferModel.create({ userId, bank, ...ACHBankTransferData });
  }
  return ACHBankTranfer;
};

export const getShareableACHTransfer = async (transfer: IACHTransfer) => {
  const fundingSource = await ACHFundingSourceModel.findOne({
    token: transfer.funding_source_token,
  });

  return {
    _id: transfer._id,
    status: transfer.status,
    amount: transfer.amount,
    createdOn: transfer.created_time,
    accountMask: fundingSource.account_suffix,
    accountType: fundingSource.account_type,
  };
};

export const getPendingACHTransfers = async (req: IRequest) => {
  const { requestor } = req;
  if (!requestor) {
    throw new Error('Requestor is not defined');
  }

  const pendingACHTransfers = await ACHTransferModel.find({
    userId: requestor._id,
    status: ACHTransferTransitionStatusEnum.Pending,
  });

  if (!pendingACHTransfers) return [];

  const dataToReturn = [];

  for (const transfer of pendingACHTransfers) {
    dataToReturn.push(await getShareableACHTransfer(transfer));
  }

  return dataToReturn;
};

export const getACHTransfers = async (req: IRequest) => {
  const { requestor } = req;
  if (!requestor) {
    throw new Error('Requestor is not defined');
  }

  const achTransfers = await ACHTransferModel.find({
    userId: requestor._id,
  });

  if (!achTransfers) return [];

  const dataToReturn = [];

  for (const transfer of achTransfers) {
    dataToReturn.push(await getShareableACHTransfer(transfer));
  }

  return dataToReturn;
};

export const updateACHTransfer = async (req: IRequest<IACHTransferParams, {}, IMarqetaACHBankTransferTransition>) => {
  const requiredFields = ['status'];
  const { isValid, missingFields } = verifyRequiredFields(requiredFields, req.body);
  if (!isValid) {
    throw new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG);
  }

  const { requestor } = req;
  const { status } = req.body;
  const { achTransferId } = req.params;
  const achTransfer = await ACHTransferModel.findById(achTransferId);
  if (!achTransfer) {
    throw new CustomError('ACH Transfer not found.', ErrorTypes.GEN);
  }
  if (achTransfer.userId.toString() !== requestor._id.toString()) {
    throw new CustomError('You are not authorized to cancel this pending transfer.', ErrorTypes.GEN);
  }
  if (achTransfer.status !== ACHTransferTransitionStatusEnum.Pending) {
    throw new CustomError('This transfer cannot be cancelled since it is no longer in a pending state.', ErrorTypes.GEN);
  }

  const data = {
    bankTransferToken: achTransfer.token,
    status,
    channel: achTransfer.channel,
  };

  // Instantiate the MarqetaClient
  const marqetaClient = new MarqetaClient();
  // Instantiate the ACH FUNDING source class
  const achFundingSource = new ACHSource(marqetaClient);
  const updatedTransfer = await achFundingSource.updateACHBankTransfer(data);
  if (!updatedTransfer) throw new CustomError('Unable to update ACH transfer.', ErrorTypes.GEN);
  return updatedTransfer;
};

export const getACHSourceBankName = async (accessToken: string) => {
  const bankConnection = await BankConnectionModel.findOne({ 'integrations.plaid.accessToken': accessToken });
  if (!bankConnection) throw new CustomError('Unable to find bank connection.', ErrorTypes.GEN);
  return bankConnection;
};

export const initiateACHBankTransfer = async (req: IRequest<{}, {}, IMarqetaACHBankTransfer>) => {
  const { body } = req;
  const { amount, fundingSourceToken } = body;
  const { _id } = req.requestor;
  const requiredFields = ['amount', 'type', 'fundingSourceToken'];
  const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
  if (!isValid) {
    throw new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG);
  }

  if (!_id) throw new CustomError('User id required.', ErrorTypes.GEN);
  const { isError, message } = await validateCreateACHBankTransferRequest({ userId: _id, ...body });
  if (isError) throw new CustomError(message, ErrorTypes.INVALID_ARG);
  // Create ACH transfer in marqeta
  const achTransferData = await createACHBankTransfer(req);
  if (!achTransferData) throw new CustomError('Unable to create ACH transfer.', ErrorTypes.GEN);
  const { data } = achTransferData;
  // get the bank Responsible for this ACH transfer
  const bankConnection = await BankConnectionModel.findOne({ userId: _id, fundingSourceToken });
  const { mask, name, subtype, institution, type } = bankConnection;
  const bank = { mask, name, subtype, institution, type };
  // Store ACH transfer in karma database
  const savedACHTransfer = await mapACHBankTransfer(_id, data, bank);
  if (!savedACHTransfer) throw new CustomError('Error saving the ACH Transfer to the database.', ErrorTypes.GEN);

  if (achTransferData.data.status === ACHTransferTransitionStatusEnum.Pending) {
    const transferBankData = await ACHFundingSourceModel.findOne({
      token: fundingSourceToken,
    });
    // Create user notification
    await createACHInitiationUserNotification({
      user: req.requestor,
      amount,
      accountMask: transferBankData.account_suffix.toString(),
      accountType: `${bankConnection?.institution} ${transferBankData.account_type.toString()}`,
      date: dayjs(data.created_time).utc().format('MMMM DD, YYYY'),
    });
  }

  return getShareableACHTransfer(savedACHTransfer);
};

export const handleMarqetaACHTransitionWebhook = async (banktransfertransition: IMarqetaBankTransferTransitionEvent) => {
  console.log('//// handle Marqeta webhook');
  const userTransitions = await ACHTransferModel.findOneAndUpdate(
    {
      token: banktransfertransition.bank_transfer_token,
    },
    {
      $set: { status: banktransfertransition.status },
      $push: { transitions: banktransfertransition },
    },
  );
  if (!userTransitions?._id) throw new CustomError(`User transition not found for token: ${banktransfertransition.bank_transfer_token}`, ErrorTypes.GEN);

  const user = await UserModel.findById(userTransitions?.userId);
  if (!user?._id) throw new CustomError('User not found.', ErrorTypes.GEN);

  const { status, return_reason } = banktransfertransition;
  const achTransfer = await ACHTransferModel.findOne({ token: banktransfertransition.bank_transfer_token });
  if (!achTransfer) throw new CustomError(`ACH Transfer not found for token ${banktransfertransition.bank_transfer_token}`, ErrorTypes.GEN);

  const transferBankData = await ACHFundingSourceModel.findOne({
    token: achTransfer.funding_source_token,
  });
  if (!transferBankData) throw new CustomError(`Funding source not found for token ${achTransfer?.funding_source_token}`, ErrorTypes.GEN);

  const bankName = await getACHSourceBankName(transferBankData.accessToken);
  if (!bankName) throw new CustomError(`Bank name not found for accessToken: ${transferBankData.accessToken}`, ErrorTypes.GEN);

  console.log('////// RECEIVED ACH TRANSFER WEBHOOK', banktransfertransition);

  switch (status) {
    case MarqetaBankTransitionStatus.COMPLETED:
      await createPushUserNotificationFromUserAndPushData(user, {
        pushNotificationType: PushNotificationTypes.FUNDS_AVAILABLE,
        body: 'Your funds are now available on your Karma Wallet Card!',
        title: 'Deposit Alert',
      });
      break;
    case MarqetaBankTransitionStatus.CANCELLED:
      console.log('////// ACH Transfer was cancelled', banktransfertransition.bank_transfer_token);
      // To do: add email
      await createPushUserNotificationFromUserAndPushData(user, {
        pushNotificationType: PushNotificationTypes.ACH_TRANSFER_CANCELLED,
        body: 'Your deposit was cancelled. Please contact support@karmawallet.io if you have questions.',
        title: 'ACH Transfer Alert',
      });

      await createACHTransferCancelledUserNotification({
        user,
        amount: achTransfer.amount.toFixed(2),
        accountMask: transferBankData.account_suffix.toString(),
        accountType: `${bankName} ${transferBankData.account_type.toString()}`,
        date: dayjs(achTransfer.created_time).utc().format('MMMM DD, YYYY'),
      });
      break;
    case MarqetaBankTransitionStatus.RETURNED:
      console.log('////// ACH Transfer was returned', banktransfertransition.bank_transfer_token);
      // To do: add email
      await createPushUserNotificationFromUserAndPushData(user, {
        pushNotificationType: PushNotificationTypes.ACH_TRANSFER_RETURNED,
        body: `Your deposit was returned because: ${return_reason}.`,
        title: 'ACH Transfer Alert',
      });

      await createACHTransferReturnedUserNotification({
        user,
        amount: achTransfer.amount.toFixed(2),
        accountMask: transferBankData.account_suffix.toString(),
        accountType: `${bankName} ${transferBankData.account_type.toString()}`,
        date: dayjs(achTransfer.created_time).utc().format('MMMM DD, YYYY'),
        reason: return_reason,
      });
      break;
    default:
      break;
  }
};
