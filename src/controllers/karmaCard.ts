import { z, SafeParseError, ZodError } from 'zod';
import { api, error } from '../services/output';
import CustomError, { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as KarmaCardService from '../services/karmaCard';
import * as KarmaCardTypes from '../services/karmaCard/types';
import { getApplicationDecisionData } from '../services/karmaCard/utils';
import { ErrorTypes } from '../lib/constants';
import { getShareableFieldErrors } from '../lib/validation';
import { ICheckoutSessionParams } from '../integrations/stripe/types';

export const applyForKarmaCard: IRequestHandler<{}, {}, KarmaCardTypes.IKarmaCardRequestBody> = async (req, res) => {
  try {
    const applyResponse = await KarmaCardService.applyForKarmaCard(req);
    api(req, res, getApplicationDecisionData(applyResponse));
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getApplicationStatus: IRequestHandler<{}, {}, { email: string }> = async (req, res) => {
  try {
    const getApplicationStatusSchema = z.object({
      email: z.string().email(),
    });

    const parsed = getApplicationStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<{ email: string }>)?.error as ZodError)?.formErrors?.fieldErrors;
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }
    const applyResponse = await KarmaCardService.getApplicationData(parsed.data.email);
    const transformedResponse = getApplicationDecisionData(applyResponse);
    if (!transformedResponse.status) {
      throw new CustomError('No application found', ErrorTypes.NOT_FOUND);
    }
    api(req, res, transformedResponse);
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

export const createMembershipCheckoutSession: IRequestHandler<{}, {}, ICheckoutSessionParams> = async (req, res) => {
  try {
    const checkoutSession = await KarmaCardService.createMembershipCheckoutSession(req);
    api(req, res, checkoutSession);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

// export const addKarmaMembershipToUser: IRequestHandler<{}, {}, KarmaCardService.AddKarmaMembershipToUserRequest> = async (req, res) => {
//   try {
//     const user = req.requestor;

//     const addKarmaMembershipToUserSchema = z.object({
//       type: getZodEnumSchemaFromTypescriptEnum(KarmaMembershipTypeEnum),

//     });

//     const parsed = addKarmaMembershipToUserSchema.safeParse(req.body);
//     if (!parsed.success) {
//       const fieldErrors = ((parsed as SafeParseError<KarmaCardService.AddKarmaMembershipToUserRequest>)?.error as ZodError)?.formErrors
//         ?.fieldErrors;
//       console.log(formatZodFieldErrors(fieldErrors));
//       throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
//     }

//     const updatedUser = await KarmaCardService.addKarmaMembershipToUser(user, parsed.data.type, parsed.data.paymentPlan);
//     api(req, res, UserUtils.getShareableUser(updatedUser));
//   } catch (err) {
//     error(req, res, asCustomError(err));
//   }
// };

// export const updateKarmaMembershipPaymentPlan: IRequestHandler<{ paymentPlan: KarmaMembershipPaymentPlanEnumValues }, {}, {}> = async (
//   req,
//   res,
// ) => {
//   try {
//     const user = req.requestor;

//     const updateKarmaMembershipToUserSchema = z.object({
//       paymentPlan: getZodEnumSchemaFromTypescriptEnum(KarmaMembershipPaymentPlanEnum),
//     });

//     const parsed = updateKarmaMembershipToUserSchema.safeParse(req.params);
//     if (!parsed.success) {
//       const fieldErrors = ((parsed as SafeParseError<{ paymentPlan: KarmaMembershipPaymentPlanEnumValues }>)?.error as ZodError)?.formErrors
//         ?.fieldErrors;
//       console.log(formatZodFieldErrors(fieldErrors));
//       throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
//     }

//     const updatedUser = await KarmaCardService.updateKarmaMembershipPaymentPlan(user, parsed.data.paymentPlan);
//     api(req, res, UserUtils.getShareableUser(updatedUser));
//   } catch (err) {
//     error(req, res, asCustomError(err));
//   }
// };

// export const cancelKarmaMembership: IRequestHandler<{ type: KarmaMembershipTypeEnumValues }, {}, {}> = async (req, res) => {
//   try {
//     const user = req.requestor;

//     const cancelKarmaMembershipToUserSchema = z.object({
//       type: getZodEnumSchemaFromTypescriptEnum(KarmaMembershipTypeEnum),
//     });

//     const parsed = cancelKarmaMembershipToUserSchema.safeParse(req.params);
//     if (!parsed.success) {
//       const fieldErrors = ((parsed as SafeParseError<{ membershipType: KarmaMembershipTypeEnumValues }>)?.error as ZodError)?.formErrors
//         ?.fieldErrors;
//       console.log(formatZodFieldErrors(fieldErrors));
//       throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
//     }

//     const updatedUser = await KarmaCardService.cancelKarmaMembership(user, parsed.data.type);
//     api(req, res, UserUtils.getShareableUser(updatedUser));
//   } catch (err) {
//     error(req, res, asCustomError(err));
//   }
// };
