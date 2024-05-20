import { z, SafeParseError, ZodError } from 'zod';
import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import CustomError, { asCustomError } from '../../lib/customError';
import { PersonaClient } from '../../clients/persona';
import { buildPersonaCreateAccountBody } from '../../integrations/persona';
import { IPersonaAccountsRequest } from '../../integrations/persona/types';
import { ErrorTypes } from '../../lib/constants';
import { formatZodFieldErrors, getShareableFieldErrors } from '../../lib/validation';
import { IGetPersonaData as IGetPersonaAccountIdBody } from '../../services/user/types';
import * as PersonaService from '../../integrations/persona';
import { ICreateKarmaCardApplicantData } from '../../services/karmaCard/utils/types';

export const getAccounts: IRequestHandler<{}, IPersonaAccountsRequest, {}> = async (req, res) => {
  try {
    const client = new PersonaClient();
    const params = req.query;
    const accounts = await client.listAllAccounts(params);
    output.api(req, res, accounts);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createAccount: IRequestHandler<{}, {}, ICreateKarmaCardApplicantData> = async (req, res) => {
  try {
    const client = new PersonaClient();
    const data = buildPersonaCreateAccountBody(req.body);
    const account = await client.createAccount(data);
    output.api(req, res, account);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getPersonaAccountId: IRequestHandler<{}, {}, IGetPersonaAccountIdBody> = async (req, res) => {
  try {
    const getPersonaAccountIdSchema = z.object({
      email: z.string().email().min(1),
    });

    const parsed = getPersonaAccountIdSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = ((parsed as SafeParseError<{ emai: string }>)?.error as ZodError)?.formErrors?.fieldErrors;
      console.log(formatZodFieldErrors(fieldErrors));
      throw new CustomError(`${getShareableFieldErrors(fieldErrors) || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
    }

    const data = await PersonaService.getPersonaAccountId(parsed?.data?.email);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
