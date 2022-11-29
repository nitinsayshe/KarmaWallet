import { InterestFormRequest } from '../integrations/hubspot';
import { ErrorTypes } from '../lib/constants';
import CustomError, { asCustomError } from '../lib/customError';
import { verifyRequiredFields } from '../lib/requestData';
import * as output from '../services/output';
import * as VisitorService from '../services/visitor';
import { IRequestHandler } from '../types/request';

export const newsletterSignup: IRequestHandler<{}, {}, VisitorService.INewsletterSignupData> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['email', 'subscriptionCode'];

    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { email, subscriptionCode } = body;
    await VisitorService.newsletterSignup(req, email, subscriptionCode);
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
