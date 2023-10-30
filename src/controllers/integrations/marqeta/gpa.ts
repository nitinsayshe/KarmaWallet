import { IMarqetaCreateGPAorder } from '../../../integrations/marqeta/types';
import { verifyRequiredFields } from '../../../lib/requestData';
import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import CustomError, { asCustomError } from '../../../lib/customError';
import * as GPAService from '../../../integrations/marqeta/gpa';
import { ErrorTypes } from '../../../lib/constants';
import { sleep } from '../../../lib/misc';

export const fundUserGPA: IRequestHandler<{}, {}, IMarqetaCreateGPAorder> = async (req, res) => {
  try {
    const { body } = req;
    const { userToken } = req.requestor.integrations.marqeta;
    const params = { userToken, ...body };

    const requiredFields = ['amount', 'currencyCode', 'fundingSourceToken'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(
        req,
        res,
        new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG),
      );
      return;
    }
    const data = await GPAService.createGPAorder(params);
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
    const { user: data } = await GPAService.getGPABalance(userToken);
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
