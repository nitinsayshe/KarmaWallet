import { IRequestHandler } from '../types/request';
import * as ACHTransferService from '../services/achTransfers';
import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IMarqetaACHBankTransfer, IMarqetaACHBankTransferTransition } from '../integrations/marqeta/types';
import { IACHTransferParams } from '../services/achTransfers';

export const getPendingACHTransfers: IRequestHandler = async (req, res) => {
  try {
    const pendingTransfers = await ACHTransferService.getPendingACHTransfers(req);
    api(
      req,
      res,
      pendingTransfers,
    );
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getACHTransfers: IRequestHandler = async (req, res) => {
  try {
    const transfers = await ACHTransferService.getACHTransfers(req);
    api(
      req,
      res,
      transfers,
    );
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const updateACHBankTransfer: IRequestHandler<IACHTransferParams, {}, IMarqetaACHBankTransferTransition> = async (req, res) => {
  try {
    const data = await ACHTransferService.updateACHTransfer(req);
    api(req, res, data);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const initiateACHBankTransfer: IRequestHandler<{}, {}, IMarqetaACHBankTransfer> = async (req, res) => {
  try {
    const data = await ACHTransferService.initiateACHBankTransfer(req);
    api(req, res, data);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
