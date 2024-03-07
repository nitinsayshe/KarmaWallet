import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import { asCustomError } from '../../lib/customError';
import { PersonaClient } from '../../clients/persona';
import { buildPersonaCreateAccountBody } from '../../integrations/persona';
import { ICreateKarmaCardApplicantData } from '../../services/karmaCard/utils';
import { IPersonaAccountsRequest } from '../../integrations/persona/types';

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
