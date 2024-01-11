import { InterestFormRequest } from '../integrations/hubspot';
import { ErrorTypes } from '../lib/constants';
import CustomError, { asCustomError } from '../lib/customError';
import { verifyRequiredFields } from '../lib/requestData';
import * as output from '../services/output';
import { IVerifyTokenBody } from '../services/user/types';
import * as VisitorService from '../services/visitor';
import { IRequestHandler } from '../types/request';

const { NODE_ENV } = process.env;

export const newsletterSignup: IRequestHandler<{}, {}, VisitorService.INewsletterSignupData> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['email', 'subscriptionCodes'];
    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);

    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { email, subscriptionCodes, params } = body;
    if (NODE_ENV === 'staging') return output.api(req, res, null);
    await VisitorService.newsletterSignup(req, email, subscriptionCodes, params);
    output.api(req, res, null);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const submitInterestForm: IRequestHandler<{}, {}, InterestFormRequest> = async (req, res) => {
  try {
    const { body } = req;

    const { email, firstName, lastName, organization, interestCategory } = body;
    const submitFormReq = {
      email,
      firstName,
      lastName,
      organization,
      interestCategory,
    };
    await VisitorService.submitInterestForm(req, submitFormReq);
    output.api(req, res, null);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createAccountForm: IRequestHandler<{}, {}, VisitorService.ICreateAccountRequest> = async (req, res) => {
  try {
    const { body } = req;
    const { email, groupCode, params, shareASale } = body;
    const createAccountFormReq = {
      email,
      groupCode,
      params,
      shareASale,
    };
    await VisitorService.createAccountForm(req, createAccountFormReq);
    output.api(req, res, null);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const verifyAccountToken: IRequestHandler<{}, {}, IVerifyTokenBody> = async (req, res) => {
  try {
    const data = await VisitorService.verifyAccountToken(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
