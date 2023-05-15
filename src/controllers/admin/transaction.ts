import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import { asCustomError } from '../../lib/customError';
import * as TransactionService from '../../services/transaction';

export const getFalsePositives: IRequestHandler<{}, TransactionService.IGetFalsePositivesQuery, {}> = async (req, res) => {
  try {
    const message = await TransactionService.getFalsePositives(req);
    output.api(req, res, message);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateFalsePositive: IRequestHandler<TransactionService.IFalsePositiveIdParam, {}, TransactionService.IUpdateFalsePositiveRequest> = async (req, res) => {
  try {
    const data = await TransactionService.updateFalsePositive(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const deleteFalsePositive: IRequestHandler<TransactionService.IFalsePositiveIdParam, {}, {}> = async (req, res) => {
  try {
    const data = await TransactionService.deleteFalsePositive(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createFalsePositive: IRequestHandler<{}, {}, TransactionService.ICreateFalsePositiveRequest> = async (req, res) => {
  try {
    const data = await TransactionService.createFalsePositive(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getManualMatches: IRequestHandler<{}, TransactionService.IGetManualMatchesQuery, {}> = async (req, res) => {
  try {
    const message = await TransactionService.getManualMatches(req);
    output.api(req, res, message);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateManualMatch: IRequestHandler<TransactionService.IManualMatchIdParam, {}, TransactionService.IUpdateManualMatchRequest> = async (req, res) => {
  try {
    const data = await TransactionService.updateManualMatch(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const deleteManualMatch: IRequestHandler<TransactionService.IManualMatchIdParam, {}, {}> = async (req, res) => {
  try {
    const data = await TransactionService.deleteManualMatch(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createManualMatch: IRequestHandler<{}, {}, TransactionService.ICreateManualMatchRequest> = async (req, res) => {
  try {
    const data = await TransactionService.createManualMatch(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getMatchedCompanies: IRequestHandler<{}, TransactionService.IGetMatchedCompaniesQuery, {}> = async (req, res) => {
  try {
    const message = await TransactionService.getMatchedCompanies(req);
    output.api(req, res, message);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
