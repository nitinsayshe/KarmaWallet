import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { NANOID_REGEX, INVALID_NAME_FIELD_CHARACTERS_REGEX, URL_QUERY_PARAMS_REGEX, UUID_REGEX, ZIPCODE_REGEX } from './constants/regex';
import { IUrlParam } from '../models/user/types';

export const objectReferenceValidation = z.string().refine((val) => isValidObjectId(val), { message: 'Must be a valid object reference' });
export const optionalObjectReferenceValidation = objectReferenceValidation.optional();
export const nameValidation = z.string().refine((val) => val.length > 0 && !INVALID_NAME_FIELD_CHARACTERS_REGEX.test(val), {
  message: "Name must be at least 1 character and not contain '{', '}', '<', '>', '(', ')', '`' or ';'",
});
export const optionalNameValidation = nameValidation.optional();
export const nanoIdValidation = z.string().refine((val) => val.length > 0 && NANOID_REGEX.test(val), { message: 'Must be a valid nanoid' });
export const optionalNanoidValidation = nanoIdValidation.optional();
export const uuidValidation = z.string().refine((val) => val.length > 0 && UUID_REGEX.test(val), { message: 'Must be a valid uuid' });
export const optionalUuidValidation = uuidValidation.optional();
export const zipCodeValidation = z
  .string()
  .refine((val) => val.length > 0 && ZIPCODE_REGEX.test(val), { message: 'Must be a valid zip code' });
export const optionalZipCodeValidation = zipCodeValidation.optional();

export const formatZodFieldErrors = (fieldErrors: { [key: string]: string[] }): string => {
  let error = '';
  Object.keys(fieldErrors).forEach((field, i) => {
    error += `${field}: ${fieldErrors[field].join(', ')}`;
    if (i !== Object.keys(fieldErrors).length - 1) error += '; ';
  });
  return error;
};

export const getShareableFieldErrors = (fieldErrors: { [key: string]: string[] }): string => {
  let error = '';
  Object.keys(fieldErrors).forEach((field) => {
    error += `Invalid or missing value provided for ${field} field\n`;
  });
  return error;
};

export const getZodEnumSchemaFromTypescriptEnum = <T extends string>(enumObj: Record<string, T>): z.ZodEnum<[T, ...T[]]> => {
  const enumValues = Object.values(enumObj);
  const zodEnumValues: [T, ...T[]] = [enumValues[0], ...enumValues.slice(1)];
  return z.enum(zodEnumValues);
};

export const filterToValidQueryParams = (urlParams: IUrlParam[]) => urlParams.filter((param) => !!URL_QUERY_PARAMS_REGEX.test(param.key) && !!URL_QUERY_PARAMS_REGEX.test(param.value));
