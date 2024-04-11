import { z, SafeParseError, ZodError } from 'zod';
import * as UserUtils from '../services/user/utils';
import { api, error } from '../services/output';
import CustomError, { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as KarmaCardService from '../services/karmaCard';
import { getShareableMarqetaUser } from '../services/karmaCard/utils';
import { ErrorTypes } from '../lib/constants';
import { formatZodFieldErrors, getShareableFieldErrors, getZodEnumSchemaFromTypescriptEnum } from '../lib/validation';
import { KarmaMembershipPaymentPlanEnum, KarmaMembershipPaymentPlanEnumValues, KarmaMembershipTypeEnum, KarmaMembershipTypeEnumValues } from '../models/user/types';

export const applyForKarmaCard: IRequestHandler<{}, {}, KarmaCardService.IKarmaCardRequestBody> = async (req, res) => {
  try {
    const applyResponse = await KarmaCardService.applyForKarmaCard(req);
    api(req, res, getShareableMarqetaUser(applyResponse));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getKarmaCardApplications: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const applications = await KarmaCardService.getKarmaCardApplications();
    api(
      req,
      res,
      applications.map((application) => KarmaCardService.getShareableKarmaCardApplication(application)),
    );
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getKarmaCardLegalText: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const legalText = await KarmaCardService.getKarmaCardLegalText(req);
    api(req, res, legalText);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const addKarmaMembershipToUser: IRequestHandler<{}, {}, KarmaCardService.AddKarmaMembershipToUserRequest> = async (req, res) => {
  try {
    const user = req.requestor;

    const addKarmaMembershipToUserSchema = z.object({
      type: getZodEnumSchemaFromTypescriptEnum(KarmaMembershipTypeEnum),
      paymentPlan: getZodEnumSchemaFromTypescriptEnum(KarmaMembershipPaymentPlanEnum),
    });

    const parsed = addKarmaMembershipToUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<KarmaCardService.AddKarmaMembershipToUserRequest>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const updatedUser = await KarmaCardService.addKarmaMembershipToUser(user, parsed.data.type, parsed.data.paymentPlan);
    api(req, res, UserUtils.getShareableUser(updatedUser));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const updateKarmaMembershipPaymentPlan: IRequestHandler<{paymentPlan: KarmaMembershipPaymentPlanEnumValues}, {}, {}> = async (req, res) => {
  try {
    const user = req.requestor;

    const updateKarmaMembershipToUserSchema = z.object({
      paymentPlan: getZodEnumSchemaFromTypescriptEnum(KarmaMembershipPaymentPlanEnum),
    });

    const parsed = updateKarmaMembershipToUserSchema.safeParse(req.params);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<{paymentPlan: KarmaMembershipPaymentPlanEnumValues}>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const updatedUser = await KarmaCardService.updateKarmaMembershipPaymentPlan(user, parsed.data.paymentPlan);
    api(req, res, UserUtils.getShareableUser(updatedUser));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const cancelKarmaMembership: IRequestHandler<{type: KarmaMembershipTypeEnumValues}, {}, {}> = async (req, res) => {
  try {
    const user = req.requestor;

    const cancelKarmaMembershipToUserSchema = z.object({
      type: getZodEnumSchemaFromTypescriptEnum(KarmaMembershipTypeEnum),
    });

    const parsed = cancelKarmaMembershipToUserSchema.safeParse(req.params);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<{membershipType: KarmaMembershipTypeEnumValues}>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const updatedUser = await KarmaCardService.cancelKarmaMembership(user, parsed.data.type);
    api(req, res, UserUtils.getShareableUser(updatedUser));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
