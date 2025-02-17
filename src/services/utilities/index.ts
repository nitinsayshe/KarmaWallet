import validator from 'html-validator';
import { IRequest } from '../../types/request';
import CustomError from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';
import { StateAbbreviationEnumValues, ZipCodeRangesForStates } from '../../lib/constants/states';

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

export const camelToSnakeCase: any = (data: any) => {
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map((item) => camelToSnakeCase(item));
    }
    const snakeCaseData: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const newKey = key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
        snakeCaseData[newKey] = camelToSnakeCase(data[key]);
      }
    }
    return snakeCaseData;
  }
  return data;
};

export const getStateFromZipcode = (zipCode: string): StateAbbreviationEnumValues | '' => {
  const zipcode = parseInt(zipCode, 10);

  const state = ZipCodeRangesForStates.find((s) => s.zipStart <= zipcode && s.zipEnd >= zipcode);
  return state ? state?.code : '';
};
