import { IUrlParam } from '../models/user';
import { URL_QUERY_PARAMS_REGEX } from './constants/regex';

export const formatZodFieldErrors = (fieldErrors: { [key: string]: string[] }): string => {
  let error = '';
  Object.keys(fieldErrors).forEach((field, i) => {
    error += `${field}: ${fieldErrors[field].join(', ')}`;
    if (i !== Object.keys(fieldErrors).length - 1) error += '; ';
  });
  return error;
};

export const filterToValidQueryParams = (urlParams: IUrlParam[]) => urlParams.filter(
  (param) => !!URL_QUERY_PARAMS_REGEX.test(param.key) && !!URL_QUERY_PARAMS_REGEX.test(param.value),
);
