import { IACHBankTransferQuery, IACHFundingSourceQuery, IMarqetaACHBankTransferTransition } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as ACHFundingSourceService from '../../../integrations/marqeta/accountFundingSource';
import { ErrorTypes } from '../../../lib/constants';

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

// Function to retrieve ACH funding source data that is mapped in the ImpactKarma database
export const getLocalACHFundingSource: IRequestHandler<{}, IACHFundingSourceQuery, {}> = async (req, res) => {
  try {
    const { _id: userId } = req.requestor;
    req.query.userId = userId;
    const { isError, message } = await ACHFundingSourceService.validateGetACHFundingSourceRequest({ userId, ...req.query });
    if (isError) return output.error(req, res, new CustomError(message, ErrorTypes.INVALID_ARG));
    const { data } = await ACHFundingSourceService.getLocalACHFundingSource(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

// Function to retrieve ACH transfer data that is mapped in the ImpactKarma database
export const getLocalACHBankTransfer: IRequestHandler<{}, IACHBankTransferQuery, {}> = async (req, res) => {
  try {
    const { _id: userId } = req.requestor;
    req.query.userId = userId;
    const { isError, message } = await ACHFundingSourceService.validateGetLocalACHBankTransferRequest({ userId, ...req.query });
    if (isError) return output.error(req, res, new CustomError(message, ErrorTypes.INVALID_ARG));
    const { data } = await ACHFundingSourceService.getLocalACHBankTransfer(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
