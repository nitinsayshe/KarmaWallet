import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import { asCustomError } from '../../lib/customError';
import * as TransactionService from '../../services/transaction';
import * as TransactionTypes from '../../services/transaction/types';

export const getFalsePositives: IRequestHandler<{}, TransactionTypes.IGetFalsePositivesQuery, {}> = async (req, res) => {
  try {
    const message = await TransactionService.getFalsePositives(req);
    output.api(req, res, message);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateFalsePositive: IRequestHandler<TransactionTypes.IFalsePositiveIdParam, {}, TransactionTypes.IUpdateFalsePositiveRequest> = async (req, res) => {
  try {
    const data = await TransactionService.updateFalsePositive(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const deleteFalsePositive: IRequestHandler<TransactionTypes.IFalsePositiveIdParam, {}, {}> = async (req, res) => {
  try {
    const data = await TransactionService.deleteFalsePositive(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createFalsePositive: IRequestHandler<{}, {}, TransactionTypes.ICreateFalsePositiveRequest> = async (req, res) => {
  try {
    const data = await TransactionService.createFalsePositive(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getManualMatches: IRequestHandler<{}, TransactionTypes.IGetManualMatchesQuery, {}> = async (req, res) => {
  try {
    const message = await TransactionService.getManualMatches(req);
    output.api(req, res, message);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateManualMatch: IRequestHandler<TransactionTypes.IManualMatchIdParam, {}, TransactionTypes.IUpdateManualMatchRequest> = async (req, res) => {
  try {
    const data = await TransactionService.updateManualMatch(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const deleteManualMatch: IRequestHandler<TransactionTypes.IManualMatchIdParam, {}, {}> = async (req, res) => {
  try {
    const data = await TransactionService.deleteManualMatch(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const createManualMatch: IRequestHandler<{}, {}, TransactionTypes.ICreateManualMatchRequest> = async (req, res) => {
  try {
    const data = await TransactionService.createManualMatch(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getMatchedCompanies: IRequestHandler<{}, TransactionTypes.IGetMatchedCompaniesQuery, {}> = async (req, res) => {
  try {
    const message = await TransactionService.getMatchedCompanies(req);
    output.api(req, res, message);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
