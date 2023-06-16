import validator from 'html-validator';
import { IRequest } from '../../types/request';
import CustomError from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';

export interface IValidateHtmlBody {
  html: string;
}

export const validateHtml = async (req: IRequest<{}, {}, IValidateHtmlBody>) => {
  const { html } = req.body;
  if (!html) throw new CustomError('HTML is required', ErrorTypes.INVALID_ARG);
  const options: validator.OptionsForHtmlFileAsValidationTargetAndObjectAsResult = {
    data: html,
    isFragment: true,
    // messages that are coming back that should be ignored need to be added verbatim here
    ignore: [
      'Trailing slash on void elements has no effect and interacts badly with unquoted attribute values.',
    ],
  };
  const result = await validator(options);
  console.log('\n\n -- ', result, ' -- \n\n');
  return { result };
};
