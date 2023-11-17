import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { ACHSource } from '../../clients/marqeta/accountFundingSource';
import { IRequest } from '../../types/request';
import { IACHBankTransferRequestFields, IACHBankTransferModelQuery, IACHBankTransferQuery, IACHFundingSource, IACHFundingSourceModelQuery, IACHFundingSourceQuery, IACHTransferValidationQuery, IMACHTransferStatus, IMarqetaACHBankTransfer, IMarqetaACHBankTransferTransition, IMarqetaACHPlaidFundingSource, IMarqetaACHTransferType, IACHTransferTypes, ListACHFundingSourcesForUserResponse, PaginatedMarqetaResponse, ListACHBankTransfersResponse, ACHTransferModel as ACHTransferModelType } from './types';
import { ACHTransferModel } from '../../models/achTransfer';
import { ACHFundingSourceModel } from '../../models/achFundingSource';
import { dailyACHTransferLimit, monthlyACHTransferLimit, perTransferLimit } from '../../lib/constants/plaid';
import { DATE_REGEX } from '../../lib/constants/regex';

dayjs.extend(utc);

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

// list user's funding sources
export const listACHFundingSourcesForUser = async (userId: string, params?: any): Promise<ListACHFundingSourcesForUserResponse> => {
  const sources = await achFundingSource.listACHFundingSourceForUser(userId, params);
  return { data: sources };
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

export const listACHBankTransfer = async (req: IRequest<{}, { userToken: string, fundingSourceToken: string }, {}>): Promise<ListACHBankTransfersResponse> => {
  const params = req.query;
  const response: PaginatedMarqetaResponse<ACHTransferModelType[]> = await achFundingSource.listACHBankTransfer(params);
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

export const getLocalACHFundingSource = async (req: IRequest<{}, IACHFundingSourceQuery, {}>) => {
  const { userId, fundingSourceToken, userToken, fromDate, toDate } = req.query;

  const query: IACHFundingSourceModelQuery = { userId, active: true };

  if (fundingSourceToken) query.token = fundingSourceToken;
  if (userToken) query.user_token = userToken;
  if (fromDate && toDate) {
    query.last_modified_time = {
      $gte: new Date(fromDate),
      $lt: new Date(dayjs(toDate).add(1, 'day').format('YYYY-MM-DD')),
    };
  }

  const ACHFundingSources = await ACHFundingSourceModel.find(query);
  return { data: ACHFundingSources };
};

export const getLocalACHBankTransfer = async (req: IRequest<{}, IACHBankTransferQuery, {}>) => {
  const { userId, bankTransferToken, fundingSourceToken, type, status, fromDate, toDate } = req.query;

  const query: IACHBankTransferModelQuery = { userId };

  if (bankTransferToken) query.token = bankTransferToken;
  if (fundingSourceToken) query.fundingSourceToken = fundingSourceToken;
  if (type) query.type = type;
  if (status) query.status = status;
  if (fromDate && toDate) {
    query.last_modified_time = {
      $gte: new Date(fromDate),
      $lt: new Date(dayjs(toDate).add(1, 'day').format('YYYY-MM-DD')),
    };
  }

  const ACHBankTransfers = await ACHTransferModel.find(query);
  return { data: ACHBankTransfers };
};

export const validateACHTransferLimit = async (query: IACHTransferValidationQuery) => {
  const { userId, fundingSourceToken, type, statusArray, fromDate, toDate, limit, amount } = query;
  const result = await ACHTransferModel.aggregate([
    {
      $match: {
        userId,
        funding_source_token: fundingSourceToken,
        type,
        status: { $in: statusArray },
        last_modified_time: {
          $gte: fromDate,
          $lt: toDate,
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

export const validateCreateACHBankTransferRequest = async (query: IACHBankTransferRequestFields): Promise<{ isError: Boolean, message: string }> => {
  const { fundingSourceToken, type, amount, userId } = query;

  const isTypeValid = Object.values(IMarqetaACHTransferType).includes(type.toUpperCase() as IMarqetaACHTransferType);
  if (!isTypeValid) return { isError: true, message: 'please provide correct type value' };

  if (+amount > perTransferLimit) return { isError: true, message: `Invalid Amount. Amount must be less than or equal to ${perTransferLimit} per transfer` };

  const beforeOneMonth = new Date(dayjs().utc().subtract(1, 'month').format('YYYY-MM-DD'));
  const today = new Date(dayjs().utc().format('YYYY-MM-DD'));
  const nextDay = new Date(dayjs().utc().add(1, 'day').format('YYYY-MM-DD'));

  const dailyLimitBody = {
    userId,
    fundingSourceToken,
    fromDate: today,
    toDate: nextDay,
    limit: dailyACHTransferLimit,
    type,
    amount: +amount,
    statusArray: [IMACHTransferStatus.PENDING],
  };

  const isValidDailyLimit = await validateACHTransferLimit(dailyLimitBody);

  if (!isValidDailyLimit) return { isError: true, message: `Invalid Amount. Daily amount transfer limit exceeded. Total transfer amount must be less than or equal to ${dailyACHTransferLimit} per day.` };

  const monthlyLimitBody = {
    userId,
    fundingSourceToken,
    fromDate: beforeOneMonth,
    toDate: nextDay,
    limit: monthlyACHTransferLimit,
    type,
    amount: +amount,
    statusArray: [IMACHTransferStatus.PENDING, IMACHTransferStatus.PROCESSING, IMACHTransferStatus.SUBMITTED, IMACHTransferStatus.COMPLETED],
  };

  const isValidMonthlyLimit = await validateACHTransferLimit(monthlyLimitBody);
  if (!isValidMonthlyLimit) return { isError: true, message: `Invalid Amount. Monthly amount transfer limit exceeded. Total transfer amount must be less than or equal to ${monthlyACHTransferLimit} per month.` };

  return { isError: false, message: 'All request fields are Valid' };
};

export const validateGetACHFundingSourceRequest = async (query: IACHFundingSourceQuery): Promise<{ isError: Boolean, message: string }> => {
  const { fromDate, toDate } = query;

  if ((fromDate && toDate) && !(DATE_REGEX.test(fromDate.toString()) && DATE_REGEX.test(toDate.toString()))) {
    return { isError: true, message: 'Please provide correct fromDate or toDate value in YYYY-MM-DD format' };
  }

  if ((fromDate && !toDate) || (!fromDate && toDate)) {
    return { isError: true, message: `please provide ${(fromDate && 'toDate') || (toDate && 'fromDate')} query prameter value` };
  }

  return { isError: false, message: 'All request fields are valid' };
};

export const validateGetLocalACHBankTransferRequest = async (query: IACHBankTransferQuery): Promise<{ isError: Boolean, message: string }> => {
  const { status, type, fromDate, toDate } = query;
  if (status) {
    const isStatusValid: Boolean = Object.values(IMACHTransferStatus).includes(status);
    if (!isStatusValid) return { isError: true, message: 'Please provide correct status value' };
  }

  if (type) {
    const isTypeValid: Boolean = Object.values(IACHTransferTypes).includes(type);
    if (!isTypeValid) return { isError: true, message: 'Please provide correct type value' };
  }

  if ((fromDate && toDate) && !(DATE_REGEX.test(fromDate.toString()) && DATE_REGEX.test(toDate.toString()))) {
    return { isError: true, message: 'Please provide correct fromDate or toDate value in  YYYY-MM-DD format' };
  }

  if ((fromDate && !toDate) || (!fromDate && toDate)) {
    return { isError: true, message: `Please provide ${(fromDate && 'toDate') || (toDate && 'fromDate')} query prameter value` };
  }

  return { isError: false, message: 'All request fields are Valid' };
};
