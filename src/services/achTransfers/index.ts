import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ACHSource } from '../../clients/marqeta/accountFundingSource';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { createACHBankTransfer, mapACHBankTransfer, validateCreateACHBankTransferRequest } from '../../integrations/marqeta/accountFundingSource';
import { ACHTransferTransitionStatusEnum, IMarqetaACHBankTransfer, IMarqetaACHBankTransferTransition } from '../../integrations/marqeta/types';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { verifyRequiredFields } from '../../lib/requestData';
import { ACHFundingSourceModel } from '../../models/achFundingSource';
import { ACHTransferModel, IACHTransfer } from '../../models/achTransfer';
import { IRequest } from '../../types/request';
import { createACHInitiationUserNotification } from '../user_notification';

dayjs.extend(utc);

export interface IACHTransferParams {
  achTransferId: string;
}

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
  const achTransferData = await createACHBankTransfer(req);
  const { data } = achTransferData;
  const savedACHTransfer = await mapACHBankTransfer(_id, data);
  if (!savedACHTransfer) throw new CustomError('Unable to create ACH transfer entry.', ErrorTypes.GEN);
  const transferBankData = await ACHFundingSourceModel.findOne({
    token: fundingSourceToken,
  });

  /// create a user notifiction, also need to create a notification for this type in general

  await createACHInitiationUserNotification({
    user: req.requestor,
    amount,
    accountMask: transferBankData.account_suffix.toString(),
    accountType: transferBankData.account_type.toString(),
    date: dayjs(data.created_time).utc().format('MMMM DD, YYYY'),
  });

  return getShareableACHTransfer(savedACHTransfer);
};
