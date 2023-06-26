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
  };
  const validateResult = await validator(options);
  result.errors = [];

  validateResult.messages.forEach((message) => {
    if (message.message === 'Trailing slash on void elements has no effect and interacts badly with unquoted attribute values.') return;
    result.errors.push({ error: message.message, location: (message as any).extract });
  });

  result.isValid = html.includes('<') === true && result.errors.length === 0;

  return result;
};
