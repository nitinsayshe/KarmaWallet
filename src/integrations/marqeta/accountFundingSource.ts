import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { ACHSource } from '../../clients/marqeta/accountFundingSource';
import { IRequest } from '../../types/request';
import { IACHBankTransfer, IACHFundingSource, IMarqetaACHBankTransfer, IMarqetaACHBankTransferTransition, IMarqetaACHPlaidFundingSource } from './types';
import { ACHTransferModel } from '../../models/achTransfer';
import { ACHFundingSourceModel } from '../../models/achFundingSource';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the ACH FUNDING source class
const achFundingSource = new ACHSource(marqetaClient);

export const createAchFundingSource = async (req: IRequest<{}, {}, IMarqetaACHPlaidFundingSource>) => {
  const { _id: userId } = req.requestor;
  const params = { ...req.body };
  const userResponse = await achFundingSource.createAchFundingSource(params);
  return { data: userResponse };
};

export const createAchFundingSource1 = async (data: IMarqetaACHPlaidFundingSource) => {
  const userResponse = await achFundingSource.createAchFundingSource(data);
  return { data: userResponse };
};

export const createACHBankTransfer = async (req: IRequest<{}, {}, IMarqetaACHBankTransfer>) => {
  const params = req.body;
  const userResponse = await achFundingSource.createACHBankTransfer(params);
  return { data: userResponse };
};

export const listACHBankTransfer = async (req: IRequest<{}, { userToken: string, fundingSourceToken: string }, {}>) => {
  const params = req.query;
  const response = await achFundingSource.listACHBankTransfer(params);
  return { data: response };
};

export const getACHBankTransfer = async (achToken: string) => {
  const userResponse = await achFundingSource.getACHBankTransfer(achToken);
  return { data: userResponse };
};

export const createACHBankTransferTransition = async (req: IRequest<{}, {}, IMarqetaACHBankTransferTransition>) => {
  const params = req.body;
  const userResponse = await achFundingSource.createACHBankTransferTransition(params);
  return { data: userResponse };
};

export const mapACHFundingSource = async (userId: string, ACHFundingSourceData: IACHFundingSource) => {
  const { token } = ACHFundingSourceData;
  const ACHFundingSource = await ACHFundingSourceModel.findOne({ userId, token });

  if (!ACHFundingSource) {
    await ACHFundingSourceModel.create({ userId, ...ACHFundingSourceData });
  }
};

export const mapACHBankTransfer = async (userId: string, ACHBankTransferData: IACHBankTransfer) => {
  const { token } = ACHBankTransferData;
  const ACHBankTranfer = await ACHTransferModel.findOne({ userId, token });

  if (!ACHBankTranfer) {
    await ACHTransferModel.create({ userId, ...ACHBankTransferData });
  }
};
