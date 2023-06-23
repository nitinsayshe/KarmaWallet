import validator from 'html-validator';
import { IRequest } from '../../types/request';
import CustomError from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';

export interface IValidateHtmlBody {
  html: string;
}

export interface IValidateHtmlError {
  error: string;
  location: string;
}

export interface IValidateHtmlResult {
  isValid: boolean;
  errors: IValidateHtmlError[];
}

export const validateHtml = async (req: IRequest<{}, {}, IValidateHtmlBody>) => {
  const { html } = req.body;
  if (!html) throw new CustomError('HTML is required', ErrorTypes.INVALID_ARG);

  const result: Partial<IValidateHtmlResult> = {
    isValid: false,
  };

  const options: validator.OptionsForHtmlFileAsValidationTargetAndObjectAsResult = {
    data: html,
    isFragment: true,
    // messages that are coming back that should be ignored need to be added verbatim here
  };
  const validateResult = await validator(options);
  result.isValid = validateResult.messages.length === 0 && html.includes('<') === true;
  result.errors = [];

  validateResult.messages.forEach((message) => {
    result.errors.push({ error: message.message, location: (message as any).extract });
  });

  return result;
};
