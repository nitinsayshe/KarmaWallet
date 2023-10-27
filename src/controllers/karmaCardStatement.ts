import * as KarmaCardStatementTypes from '../services/karmaCardStatement/types';
import * as KarmaCardStatementService from '../services/karmaCardStatement';
import { IRequestHandler } from '../types/request';
import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';

export const getKarmaCardStatement: IRequestHandler<KarmaCardStatementTypes.IKarmaCardStatementIdParam> = async (req, res) => {
  try {
    const karmaCardStatement = await KarmaCardStatementService.getKarmaCardStatement(req);
    api(req, res, karmaCardStatement);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getKarmaCardStatementPDF: IRequestHandler<KarmaCardStatementTypes.IKarmaCardStatementIdParam> = async (req, res) => {
  try {
    const karmaCardStatementPDFStream = await KarmaCardStatementService.getKarmaCardStatementPDF(req);
    api(req, res, karmaCardStatementPDFStream);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
