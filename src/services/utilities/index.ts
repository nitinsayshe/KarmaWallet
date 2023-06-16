import validator from 'html-validator';
import { IRequest } from '../../types/request';
import CustomError from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';

export interface IValidateHtmlBody {
  html: string;
}

export interface IValidateHtmlResult {
  isValid: boolean;
  errors: string[];
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

  result.isValid = typeof validateResult === 'string' && validateResult === 'The document validates according to the specified schema(s).';

  console.log('\n\n\n\n', { validateResult }, '\n\n\n\n');

  result.errors = [];

  console.log('\n\n -- ', result, ' -- \n\n');
  return result;
};
