import { SafeParseError, z, ZodError } from 'zod';
import { Types } from 'mongoose';
import CustomError, { asCustomError } from '../../lib/customError';
import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as KardService from '../../integrations/kard';
import { ErrorTypes } from '../../lib/constants';
import {
  formatZodFieldErrors,
  getShareableFieldErrors,
  getZodEnumSchemaFromTypescriptEnum,
  objectReferenceValidation,
  optionalZipCodeValidation,
} from '../../lib/validation';
import {
  GetLocationsByMerchantIdRequest,
  GetLocationsRequest,
  KardMerchantCategoryEnum,
  OfferSource,
  PaginationFields,
} from '../../clients/kard/types';
import { StateAbbreviationEnum } from '../../lib/constants/states';

export const zodGetLocationsValidationSchema = z.object({
  page: z.number().int().gte(0).optional(),
  limit: z.number().int().gte(1).optional(),
  locationName: z.string().optional(),
  googleId: z.string().optional(),
  city: z.string().optional(),
  state: getZodEnumSchemaFromTypescriptEnum(StateAbbreviationEnum).optional(),
  zipCode: optionalZipCodeValidation,
  createdDateStart: z.string().optional(),
  createdDateEnd: z.string().optional(),
  locationNameSort: z.union([z.literal(1), z.literal(-1)]).optional(),
  citySort: z.union([z.literal(1), z.literal(-1)]).optional(),
  stateSort: z.union([z.literal(1), z.literal(-1)]).optional(),
  longitude: z.number().gte(-180).lte(180).optional(),
  latitude: z.number().gte(-90).lte(90).optional(),
  radius: z.number().gte(1).lte(50).optional(),
  category: getZodEnumSchemaFromTypescriptEnum(KardMerchantCategoryEnum).optional(),
  source: getZodEnumSchemaFromTypescriptEnum(OfferSource).optional(),
});

export const getLocation: IRequestHandler<{ locationId: string }, {}, {}> = async (req, res) => {
  try {
    const validationSchema = z.object({ locationId: objectReferenceValidation });
    const parsed = validationSchema.safeParse(req.params);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<{ locationId: Types.ObjectId }>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const data = await KardService.getLocation(parsed.data.locationId);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getLocations: IRequestHandler<{}, GetLocationsRequest, {}> = async (req, res) => {
  try {
    const validationSchema = zodGetLocationsValidationSchema;
    const parsed = validationSchema.safeParse(req.query);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<GetLocationsRequest>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const data = await KardService.getLocations(parsed.data);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getEligibleLocations: IRequestHandler<{}, GetLocationsRequest, {}> = async (req, res) => {
  try {
    const { requestor } = req;
    const validationSchema = zodGetLocationsValidationSchema;
    const parsed = validationSchema.safeParse(req.query);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<GetLocationsRequest>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const data = await KardService.getEligibleLocations(requestor, parsed.data);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getMerchantLocations: IRequestHandler<{ merchantId: string }, PaginationFields, {}> = async (req, res) => {
  try {
    const validationSchema = z.object({
      id: objectReferenceValidation,
      page: z.number().int().gte(0).optional(),
      limit: z.number().int().gte(1).optional(),
    });

    const kardRequest: GetLocationsByMerchantIdRequest = { id: req.params.merchantId, ...req.query };
    const parsed = validationSchema.safeParse(kardRequest);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<GetLocationsByMerchantIdRequest>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const data = await KardService.getLocationsByMerchantId(kardRequest);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getRewardsMerchantById: IRequestHandler<{ merchantId: string }, PaginationFields, {}> = async (req, res) => {
  try {
    const validationSchema = z.object({
      id: objectReferenceValidation,
      page: z.number().int().gte(0).optional(),
      limit: z.number().int().gte(1).optional(),
    });

    const kardRequest: GetLocationsByMerchantIdRequest = { id: req.params.merchantId, ...req.query };
    const parsed = validationSchema.safeParse(kardRequest);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<GetLocationsByMerchantIdRequest>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const data = await KardService.getRewardsMerchantById(kardRequest);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
