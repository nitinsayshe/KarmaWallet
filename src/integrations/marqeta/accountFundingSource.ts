import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { ACHSource } from '../../clients/marqeta/accountFundingSource';
import { IRequest } from '../../types/request';
import { IACHBankTransfer, IACHBankTransferModelQuery, IACHBankTransferQuery, IACHFundingSource, IACHFundingSourceModelQuery, IACHFundingSourceQuery, IACHTransferValidationQuery, IMarqetaACHBankTransfer, IMarqetaACHBankTransferTransition, IMarqetaACHPlaidFundingSource } from './types';
import { ACHTransferModel } from '../../models/achTransfer';
import { ACHFundingSourceModel } from '../../models/achFundingSource';

// Instantiate the MarqetaClient
const marqetaClient = new MarqetaClient();

// Instantiate the ACH FUNDING source class
const achFundingSource = new ACHSource(marqetaClient);

// store funding source of user to karma DB
export const mapACHFundingSource = async (userId: string, ACHFundingSourceData: IACHFundingSource) => {
  const { token } = ACHFundingSourceData;
  const ACHFundingSource = await ACHFundingSourceModel.findOne({ userId, token });
  if (!ACHFundingSource) {
    await ACHFundingSourceModel.create({ userId, ...ACHFundingSourceData });
  } else {
    await ACHFundingSourceModel.updateOne({ userId, token }, ACHFundingSourceData);
  }
};

// store ACH bank transfer  to karma DB
export const mapACHBankTransfer = async (userId: string, ACHBankTransferData: IACHBankTransfer) => {
  const { token } = ACHBankTransferData;
  const ACHBankTranfer = await ACHTransferModel.findOne({ userId, token });
  if (!ACHBankTranfer) {
    await ACHTransferModel.create({ userId, ...ACHBankTransferData });
  }
};

export const createAchFundingSource = async (userId: string, data: IMarqetaACHPlaidFundingSource, accessToken: string) => {
  const userResponse = await achFundingSource.createAchFundingSource(data);
  // map the created Ach Funding Source to DB
  await mapACHFundingSource(userId, { accessToken, ...userResponse });
  return { data: userResponse };
};

export const updateACHFundingSource = async (userId: string, accessToken: string, data: any) => {
  // get the user , to extract the marqeta userToken
  const { token } = await ACHFundingSourceModel.findOne({ accessToken });
  const userResponse = await achFundingSource.updateACHFundingSource(token, data);
  // map the created Ach Funding Source to DB
  await mapACHFundingSource(userId, userResponse);
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

export const getLocalACHFundingSource = async (req : IRequest<{}, IACHFundingSourceQuery, {}>) => {
  const { userId, fundingSourceToken, userToken, fromDate, toDate } = req.query;

  const query : IACHFundingSourceModelQuery = { userId, active: true };

  if (fundingSourceToken) query.token = fundingSourceToken;
  if (userToken) query.user_token = userToken;
  if (fromDate && toDate) {
    query.last_modified_time = {
      $gte: fromDate,
      $lt: toDate,
    };
  }

  const ACHFundingSources = await ACHFundingSourceModel.find(query);
  return { data: ACHFundingSources };
};

export const getLocalACHBankTransfer = async (req : IRequest<{}, IACHBankTransferQuery, {}>) => {
  const { userId, bankTransferToken, fundingSourceToken, type, status, fromDate, toDate } = req.query;

  const query : IACHBankTransferModelQuery = { userId };

  if (bankTransferToken) query.token = bankTransferToken;
  if (fundingSourceToken) query.fundingSourceToken = fundingSourceToken;
  if (type) query.type = type;
  if (status) query.status = status;
  if (fromDate && toDate) {
    query.last_modified_time = {
      $gte: fromDate,
      $lt: toDate,
    };
  }

  const ACHBankTransfers = await ACHTransferModel.find(query);
  return { data: ACHBankTransfers };
};

export const validateACHTransferLimit = async (query : IACHTransferValidationQuery) => {
  const { userId, fundingSourceToken, type, statusArray, fromDate, toDate, limit, amount } = query;
  const result = await ACHTransferModel.aggregate([
    {
      $match: {
        userId,
        funding_source_token: fundingSourceToken,
        type,
        status: { $in: statusArray },
        last_modified_time: {
          $gte: new Date(fromDate.toString()),
          $lt: new Date(toDate.toString()),
        },
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);

  const totalAmount = result[0]?.totalAmount ? result[0].totalAmount : 0;

  if ((totalAmount + amount) <= limit) return true;
  return false;
};
