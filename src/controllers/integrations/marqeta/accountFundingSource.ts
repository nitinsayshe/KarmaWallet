import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { IACHBankTransferQuery, IACHFundingSourceQuery, IACHTransferTypes, IMarqetaACHBankTransfer, IMarqetaACHBankTransferTransition, IACHTransferStatuses } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as ACHFundingSourceService from '../../../integrations/marqeta/accountFundingSource';
import { ErrorTypes } from '../../../lib/constants';
import { DATE_REGEX } from '../../../lib/constants/regex';
import { dailyACHTransferLimit, monthlyACHTransferLimit, perTransferLimit } from '../../../lib/constants/plaid';

dayjs.extend(utc);

export const createACHBankTransfer: IRequestHandler<{}, {}, IMarqetaACHBankTransfer> = async (req, res) => {
  try {
    const { body } = req;
    const { _id: userId } = req.requestor;
    const requiredFields = ['fundingSourceToken', 'type', 'amount'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    const { fundingSourceToken, amount } = body;
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }

    if (+amount > perTransferLimit) {
      output.error(req, res, new CustomError(`Invalid Amount. Amount must be less than or equal to ${perTransferLimit} per transfer`, ErrorTypes.INVALID_ARG));
      return;
    }

    const beforeOneMonth = dayjs().subtract(1, 'month').format('YYYY-MM-DD');
    const today = dayjs().format('YYYY-MM-DD');

    const dailyLimitBody = {
      userId,
      fundingSourceToken,
      fromDate: today,
      toDate: `${today}T23:59:59`,
      limit: dailyACHTransferLimit,
      type: IACHTransferTypes.PULL,
      amount: +amount,
      statusArray: [IACHTransferStatuses.PENDING],
    };

    const isValidDailyLimit = await ACHFundingSourceService.validateACHTransferLimit(dailyLimitBody);

    if (!isValidDailyLimit) {
      output.error(req, res, new CustomError(`Invalid Amount. Daily amount transfer limit exceeded. Total transfer amount must be less than or equal to ${dailyACHTransferLimit} per day.`, ErrorTypes.INVALID_ARG));
      return;
    }

    const monthlyLimitBody = {
      userId,
      fundingSourceToken,
      fromDate: beforeOneMonth,
      toDate: `${today}T23:59:59`,
      limit: monthlyACHTransferLimit,
      type: IACHTransferTypes.PULL,
      amount: +amount,
      statusArray: [IACHTransferStatuses.PENDING, IACHTransferStatuses.COMPLETED],
    };

    const isValidMonthlyLimit = await ACHFundingSourceService.validateACHTransferLimit(monthlyLimitBody);

    if (!isValidMonthlyLimit) {
      output.error(req, res, new CustomError(`Invalid Amount. Monthly amount transfer limit exceeded. Total transfer amount must be less than or equal to ${monthlyACHTransferLimit} per month.`, ErrorTypes.INVALID_ARG));
      return;
    }

    const { data } = await ACHFundingSourceService.createACHBankTransfer(req);
    await ACHFundingSourceService.mapACHBankTransfer(userId, data);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listACHBankTransfer: IRequestHandler<{}, { userToken: string, fundingSourceToken: string }, {}> = async (req, res) => {
  try {
    const { data } = await ACHFundingSourceService.listACHBankTransfer(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getACHBankTransfer: IRequestHandler<{ achToken: string }, {}, {}> = async (req, res) => {
  try {
    const { achToken } = req.params;
    const { data } = await ACHFundingSourceService.getACHBankTransfer(achToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createACHBankTransferTransition: IRequestHandler<{}, {}, IMarqetaACHBankTransferTransition> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['bankTansferToken', 'status', 'channel'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { data } = await ACHFundingSourceService.createACHBankTransferTransition(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getLocalACHFundingSource : IRequestHandler<{}, IACHFundingSourceQuery, {}> = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const { _id: userId } = req.requestor;
    req.query.userId = userId;

    if ((fromDate && toDate) && !(DATE_REGEX.test(fromDate.toString()) && DATE_REGEX.test(toDate.toString()))) {
      output.error(req, res, new CustomError('please provide correct fromDate or toDate vlue in  YYYY-MM-DD fromat', ErrorTypes.INVALID_ARG));
      return;
    }

    if ((fromDate && !toDate) || (!fromDate && toDate)) {
      output.error(req, res, new CustomError(`please provide ${(fromDate && 'toDate') || (toDate && 'fromDate')} query prameter value`, ErrorTypes.INVALID_ARG));
      return;
    }

    const { data } = await ACHFundingSourceService.getLocalACHFundingSource(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getLocalACHBankTransfer : IRequestHandler<{}, IACHBankTransferQuery, {}> = async (req, res) => {
  try {
    const { status, type, fromDate, toDate } = req.query;
    const { _id: userId } = req.requestor;
    req.query.userId = userId;

    if (status) {
      const isStatusValid : Boolean = Object.values(IACHTransferStatuses).includes(status);
      if (!isStatusValid) {
        output.error(req, res, new CustomError('please provide correct status value', ErrorTypes.INVALID_ARG));
        return;
      }
    }

    if (type) {
      const isTypeValid : Boolean = Object.values(IACHTransferTypes).includes(type);
      if (!isTypeValid) {
        output.error(req, res, new CustomError('please provide correct type value', ErrorTypes.INVALID_ARG));
        return;
      }
    }

    if ((fromDate && toDate) && !(DATE_REGEX.test(fromDate.toString()) && DATE_REGEX.test(toDate.toString()))) {
      output.error(req, res, new CustomError('please provide correct fromDate or toDate vlue in  YYYY-MM-DD fromat', ErrorTypes.INVALID_ARG));
      return;
    }

    if ((fromDate && !toDate) || (!fromDate && toDate)) {
      output.error(req, res, new CustomError(`please provide ${(fromDate && 'toDate') || (toDate && 'fromDate')} query prameter value`, ErrorTypes.INVALID_ARG));
      return;
    }

    const { data } = await ACHFundingSourceService.getLocalACHBankTransfer(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
