import { IMarqetaCreateGPAorder, IMarqetaLoadGpaFromProgramFundingSource } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as GPAService from '../../../integrations/marqeta/gpa';
import { sleep } from '../../../lib/misc';
import { ErrorTypes } from '../../../lib/constants';

export const fundUserGPAFromProgramFundingSource: IRequestHandler<{}, {}, IMarqetaLoadGpaFromProgramFundingSource> = async (req, res) => {
  try {
    const { amount, userId } = req.body;
    if (!amount) {
      throw new CustomError('Invalid input. Body requires the following fields: amount.', ErrorTypes.INVALID_ARG);
    }

    if (!userId) {
      throw new CustomError('Invalid input. User ID is required.', ErrorTypes.INVALID_ARG);
    }
    const { data } = await GPAService.fundUserGPAFromProgramFundingSource({ userId, amount });
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const addFundsToGPAFromProgramFundingSource = async (payout: IMarqetaCreateGPAorder) => {
  try {
    const requiredFields = ['amount', 'currencyCode', 'fundingSourceToken'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, payout);
    if (!isValid) {
      throw new Error(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`);
    }
    return GPAService.createGPAorder(payout);
  } catch (err) {
    console.error(err);
  }
};

export const getGPAbalance: IRequestHandler<{}, {}, IMarqetaCreateGPAorder> = async (req, res) => {
  try {
    const { userToken } = req.requestor.integrations.marqeta;
    const { data } = await GPAService.getGPABalance(userToken);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

// get the program funding balance
export const getProgramFundingBalance: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const { data } = await GPAService.getProgramFundingBalance();
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

// send each payouts with a delay of 1 second
export const sendPayouts = async (payouts: IMarqetaCreateGPAorder[]) => {
  for (let i = 0; i < payouts.length; i++) {
    console.log(`sending payout: ${i} of ${payouts.length}`);
    const marqetaResponse = await addFundsToGPAFromProgramFundingSource(payouts[i]);
    if (!marqetaResponse) {
      console.log(`failed to send payout: ${i} of ${payouts.length}`);
    }
    sleep(1000);
  }
};
